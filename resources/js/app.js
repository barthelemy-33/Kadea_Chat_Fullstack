import { Transmit } from '@adonisjs/transmit-client'
import Alpine from 'alpinejs'

// Affiche le sous-titre de l'en-tête : « écrit… », « en ligne » ou le texte normal
function renderSubtitle() {
  const sub = document.querySelector('.kc-conv__sub')
  if (!sub) {
    return
  }

  sub.classList.remove('kc-typing', 'kc-online-text')

  if (sub.dataset.typing) {
    sub.textContent = sub.dataset.typing
    sub.classList.add('kc-typing')
  } else if (sub.dataset.online === '1') {
    sub.textContent = 'en ligne'
    sub.classList.add('kc-online-text')
  } else {
    sub.textContent = sub.dataset.default || ''
  }
}

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

Alpine.data('chatRoom', function (channel, csrfToken, me, isGroup, initialReads) {
  return {
    reads: initialReads || {},
    async init() {
      // 1. Se placer sur le bon message (protégé : une erreur ici ne bloque rien)
      try {
        const input = document.querySelector('.kc-composer input[name="content"]')
        if (input) {
          input.addEventListener('input', () => this.notifyTyping())
        }
        const wanted = window.location.hash
          ? document.getElementById(window.location.hash.slice(1))
          : null

        if (wanted) {
          this.$nextTick(() => {
            wanted.scrollIntoView({ block: 'center' })
            wanted.classList.add('kc-msg--flash')
            setTimeout(() => wanted.classList.remove('kc-msg--flash'), 2600)
          })
        } else {
          this.scrollDown()
        }
      } catch (error) {
        console.error('Kadea : défilement', error)
      }

      // 2. L'abonnement aux messages : le plus important, avant tout le reste
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
      console.log('Kadea : abonné au canal', channel)

      subscription.onMessage((data) => {
        try {
          if (data.type === 'deleted') {
            this.markDeleted(data)
          } else if (data.type === 'edited') {
            this.markEdited(data)
          } else if (data.type === 'read') {
            this.onRead(data)
          } else if (data.type === 'typing') {
            this.onTyping(data)
          } else if (data.type === 'typing') {
            this.onTyping(data)
          } else if (data.type === 'member_added' || data.type === 'member_removed') {
            this.membersChanged(data)
          } else {
            this.addMessage(data)
          }
        } catch (error) {
          console.error('Kadea : événement ignoré', data, error)
        }
      })

      // 3. Les options de confort, protégées : elles ne bloquent jamais les messages
      try {
        const input = document.querySelector('.kc-composer input[name="content"]')
        if (input) {
          input.addEventListener('input', () => this.notifyTyping())
        }
        this.refreshReads()
      } catch (error) {
        console.error('Kadea : options de confort', error)
      }
    },

    scrollDown() {
      this.$nextTick(() => {
        const box = this.$refs.scroller
        if (box) {
          box.scrollTop = box.scrollHeight
        }
      })
    },

    async refreshReads() {
      try {
        const id = channel.split('/')[1]
        const response = await fetch('/conversations/' + id + '/reads', {
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
        })
        if (!response.ok) {
          return
        }

        const fresh = await response.json()
        for (const userId of Object.keys(fresh)) {
          const previous = this.reads[userId] || 0
          this.reads[userId] = Math.max(previous, fresh[userId])
        }
        this.updateTicks()
      } catch (error) {
        // Pas grave : les coches seront mises à jour au prochain événement
      }
    },

    onRead(data) {
      // Mes propres lectures ne concernent pas mes coches
      if (data.userId === me) {
        return
      }
      const previous = this.reads[data.userId] || 0
      this.reads[data.userId] = Math.max(previous, data.upTo)
      this.updateTicks()
    },

    updateTicks() {
      const values = Object.values(this.reads)
      let minRead = 0
      if (values.length > 0) {
        minRead = Math.min(...values)
      }

      const ticks = this.$refs.list.querySelectorAll('[data-ticks]')
      for (const el of ticks) {
        const read = Number(el.getAttribute('data-id')) <= minRead
        el.textContent = read ? '✓✓' : '✓'
        el.classList.toggle('kc-ticks--read', read)
      }
    },
    markRead() {
      const id = channel.split('/')[1]
      fetch('/conversations/' + id + '/read', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'X-CSRF-TOKEN': csrfToken },
      }).catch(() => {})
    },

    notifyTyping() {
      const now = Date.now()
      if (now - (this.lastTyping || 0) < 2500) {
        return
      }
      this.lastTyping = now

      const id = channel.split('/')[1]
      fetch('/conversations/' + id + '/typing', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'X-CSRF-TOKEN': csrfToken },
      }).catch(() => {})
    },

    onTyping(data) {
      if (data.userId === me) {
        return
      }

      // Dans l'en-tête
      const sub = document.querySelector('.kc-conv__sub')
      if (sub) {
        sub.dataset.typing = isGroup ? data.name + ' écrit…' : 'écrit…'
        renderSubtitle()
      }

      // Dans une bulle, en bas de la discussion
      const bubble = this.$refs.typing
      if (bubble) {
        const box = this.$refs.scroller
        const nearBottom = box ? box.scrollHeight - box.scrollTop - box.clientHeight < 140 : true

        bubble.querySelector('.kc-typing__who').textContent = isGroup ? data.name : ''
        bubble.hidden = false

        if (nearBottom) {
          this.scrollDown()
        }
      }

      clearTimeout(this.typingTimer)
      this.typingTimer = setTimeout(() => this.stopTyping(), 3500)
    },

    stopTyping() {
      const sub = document.querySelector('.kc-conv__sub')
      if (sub) {
        delete sub.dataset.typing
        renderSubtitle()
      }

      if (this.$refs.typing) {
        this.$refs.typing.hidden = true
      }
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
      if (mine) {
        const ticks = document.createElement('span')
        ticks.className = 'kc-ticks'
        ticks.setAttribute('data-ticks', '')
        ticks.setAttribute('data-id', data.id)
        ticks.textContent = '✓'
        meta.append(' ', ticks)
      }

      bubble.append(text, meta)
      row.append(bubble)
      this.$refs.list.appendChild(row)

      if (nearBottom || mine) {
        this.scrollDown()
      }
      if (!mine) {
        this.markRead()

        // L'autre vient d'envoyer : il n'écrit plus
        const sub = document.querySelector('.kc-conv__sub')
        if (sub) {
          delete sub.dataset.typing
          renderSubtitle()
        }
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

      const ticks = block.querySelector('[data-ticks]')
      if (ticks) {
        ticks.remove()
      }

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
    online: [],

    async init() {
      if (!userId) {
        return
      }

      // Présence : un signal tout de suite, puis toutes les 25 secondes
      this.beat()
      setInterval(() => this.beat(), 25000)

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

      subscription.onMessage(() => {
        this.refreshList()
      })
    },

    async beat() {
      try {
        const response = await fetch('/presence', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'X-CSRF-TOKEN': csrfToken, 'Accept': 'application/json' },
        })
        if (!response.ok) {
          return
        }
        this.online = await response.json()
        this.applyPresence()
      } catch (error) {
        // Pas grave : le prochain signal réessaiera
      }
    },

    applyPresence() {
      const rows = document.querySelectorAll('.kc-list [data-user-id]')
      for (const row of rows) {
        const id = Number(row.dataset.userId)
        row.classList.toggle('kc-online', id > 0 && this.online.includes(id))
      }

      const sub = document.querySelector('.kc-conv__sub')
      if (sub && sub.dataset.presenceUser) {
        const id = Number(sub.dataset.presenceUser)
        sub.dataset.online = this.online.includes(id) ? '1' : '0'
        renderSubtitle()
      }
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

        // La liste vient d'être remplacée : on remet les pastilles de présence
        this.applyPresence()
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
