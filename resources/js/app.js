import { Transmit } from '@adonisjs/transmit-client'
import Alpine from 'alpinejs'

Alpine.data('alert', function () {
  return {
    isVisible: false,
    dismiss() {
      this.isVisible = false
    },
    init() {
      setTimeout(() => {
        this.isVisible = true
      }, 80)
      setTimeout(() => {
        this.dismiss()
      }, 5000)
    },
  }
})

Alpine.data('themeToggle', function () {
  return {
    theme: 'light',
    init() {
      this.theme = this.$el.dataset.initialTheme || 'light'
    },
    toggle() {
      const next = this.theme === 'dark' ? 'light' : 'dark'
      this.theme = next
      document.documentElement.setAttribute('data-theme', next)
      document.cookie = `app_theme=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
    },
  }
})

Alpine.data('chatRoom', function (channel, csrfToken, me, isGroup) {
  return {
    async init() {
      this.scrollDown()

      const transmit = new Transmit({
        baseUrl: window.location.origin,
        beforeSubscribe: (request) => {
          request.headers.set('X-CSRF-TOKEN', csrfToken)
        },
        beforeUnsubscribe: (request) => {
          request.headers.set('X-CSRF-TOKEN', csrfToken)
        },
      })
      const subscription = transmit.subscription(channel)
      await subscription.create()

      subscription.onMessage((data) => {
        if (data.type === 'deleted') {
          this.markDeleted(data)
        } else if (data.type === 'edited') {
          this.markEdited(data)
        } else if (data.type === 'member_added' || data.type === 'member_removed') {
          this.membersChanged(data)
        } else {
          this.addMessage(data)
        }
      })
    },

    scrollDown() {
      this.$nextTick(() => {
        const box = this.$refs.scroller
        if (box) {
          box.scrollTop = box.scrollHeight
        }
      })
    },
    markRead() {
      const id = channel.split('/')[1]
      fetch('/conversations/' + id + '/read', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'X-CSRF-TOKEN': csrfToken },
      }).catch(() => {})
    },

    addMessage(data) {
      const box = this.$refs.scroller
      const nearBottom = box ? box.scrollHeight - box.scrollTop - box.clientHeight < 140 : true
      const mine = data.senderId === me

      if (this.$refs.empty) {
        this.$refs.empty.remove()
      }

      const row = document.createElement('div')
      row.id = 'message-' + data.id
      row.className = 'kc-msg ' + (mine ? 'kc-msg--out' : 'kc-msg--in')

      const bubble = document.createElement('div')
      bubble.className = 'kc-bubble'

      if (isGroup && !mine) {
        const author = document.createElement('div')
        author.className = 'kc-msg__author'
        author.textContent = data.senderName
        bubble.append(author)
      }

      const text = document.createElement('p')
      text.className = 'kc-msg__text'
      text.setAttribute('data-body', '')
      text.textContent = data.content

      const meta = document.createElement('div')
      meta.className = 'kc-msg__meta'
      meta.textContent = data.time

      bubble.append(text, meta)
      row.append(bubble)
      this.$refs.list.appendChild(row)

      if (nearBottom || mine) {
        this.scrollDown()
      }
      if (!mine) {
        this.markRead()
      }
    },

    markDeleted(data) {
      const block = document.getElementById('message-' + data.id)
      if (!block) {
        return
      }

      const body = block.querySelector('[data-body]')
      const indication = document.createElement('em')
      indication.className = 'kc-deleted'
      indication.textContent = 'Ce message a été supprimé le ' + data.deletedAt
      body.replaceChildren(indication)

      const tools = block.querySelector('[data-delete]')
      if (tools) {
        tools.remove()
      }
    },

    markEdited(data) {
      const block = document.getElementById('message-' + data.id)
      if (!block) {
        return
      }

      const body = block.querySelector('[data-body]')
      body.textContent = data.content

      if (!block.querySelector('[data-edited]')) {
        const mention = document.createElement('small')
        mention.setAttribute('data-edited', '')
        mention.textContent = '(modifié)'
        body.after(mention)
      }
    },

    membersChanged(data) {
      // Si c'est moi qui ai fait l'action, ma page se recharge déjà
      if (data.by === me) {
        return
      }

      // Si c'est moi qui suis retiré, je quitte la page
      if (data.type === 'member_removed' && data.userId === me) {
        window.location.href = '/dashboard'
        return
      }

      // Sinon, la liste des membres a changé : on recharge
      window.location.reload()
    },
  }
})

Alpine.data('sidebarLive', function (userId, csrfToken) {
  return {
    async init() {
      if (!userId) {
        return
      }

      const transmit = new Transmit({
        baseUrl: window.location.origin,
        beforeSubscribe: (request) => {
          request.headers.set('X-CSRF-TOKEN', csrfToken)
        },
        beforeUnsubscribe: (request) => {
          request.headers.set('X-CSRF-TOKEN', csrfToken)
        },
      })
      const subscription = transmit.subscription('users/' + userId)
      await subscription.create()

      subscription.onMessage((data) => {
        console.log('Kadea : mise à jour de la liste', data)
        this.refreshList()
      })
    },

    async refreshList() {
      // On ne touche pas à la liste si une recherche est en cours
      const search = document.querySelector('.kc-search input')
      if (search && search.value.trim().length >= 2) {
        return
      }

      try {
        const response = await fetch('/dashboard', { credentials: 'same-origin' })
        if (!response.ok) {
          return
        }

        const html = await response.text()
        const doc = new DOMParser().parseFromString(html, 'text/html')
        const fresh = doc.querySelector('.kc-list')
        const current = document.querySelector('.kc-list')
        if (!fresh || !current) {
          return
        }

        current.innerHTML = fresh.innerHTML

        // Remettre en évidence la conversation ouverte
        // La conversation ouverte : mise en évidence, et jamais de « non lu »
        const match = window.location.pathname.match(/^\/conversations\/(\d+)/)
        if (match) {
          const row = current.querySelector('a[href="/conversations/' + match[1] + '"]')
          if (row) {
            row.classList.add('kc-row--active')

            const badge = row.querySelector('.kc-unread')
            if (badge) {
              badge.remove()
            }
            const date = row.querySelector('.kc-row__date--unread')
            if (date) {
              date.classList.remove('kc-row__date--unread')
            }
            const preview = row.querySelector('.kc-row__preview--unread')
            if (preview) {
              preview.classList.remove('kc-row__preview--unread')
            }
          }
        }
      } catch (error) {
        console.error('Kadea : impossible de rafraîchir la liste', error)
      }
    },
  }
})
// Ferme le menu d'un message quand on touche le fond ou la touche Échap
document.addEventListener('click', (event) => {
  document.querySelectorAll('details.kc-menu[open]').forEach((menu) => {
    if (!menu.contains(event.target) || event.target === menu) {
      menu.removeAttribute('open')
    }
  })
})
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    document.querySelectorAll('details.kc-menu[open]').forEach((menu) => {
      menu.removeAttribute('open')
    })
  }
})

Alpine.start()
