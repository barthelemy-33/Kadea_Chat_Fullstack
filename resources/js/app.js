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
    sending: false,
    async init() {
      // 1. Se placer sur le bon message (protégé : une erreur ici ne bloque rien)
      try {
        const input = document.querySelector('.kc-composer input[name="content"]')
        if (input) {
          input.addEventListener('input', () => this.notifyTyping())
        }
        const composer = document.querySelector('.kc-composer')
        if (composer) {
          composer.addEventListener('submit', (event) => this.send(event))

          // Le bouton d'envoi ne doit pas faire perdre le focus au champ (clavier ouvert)
          const sendButton = composer.querySelector('.kc-send')
          if (sendButton) {
            sendButton.addEventListener('mousedown', (event) => event.preventDefault())
          }
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
      // Déjà affiché : la réponse d'envoi et l'événement temps réel arrivent tous les deux
      if (document.getElementById('message-' + data.id)) {
        return
      }

      const box = this.$refs.scroller
      const nearBottom = box ? box.scrollHeight - box.scrollTop - box.clientHeight < 140 : true
      const mine = data.senderId === me

      if (this.$refs.empty) {
        this.$refs.empty.remove()
      }

      const row = mine ? this.buildOwnRow(data) : this.buildIncomingRow(data)
      this.$refs.list.appendChild(row)

      if (nearBottom || mine) {
        this.scrollDown()
      }

      if (mine) {
        this.updateTicks()
        // Ma liste de conversations doit afficher mon nouveau dernier message
        window.dispatchEvent(new CustomEvent('kc:refresh-list'))
      } else {
        this.markRead()
        this.stopTyping()
      }
    },

    buildIncomingRow(data) {
      const row = document.createElement('div')
      row.id = 'message-' + data.id
      row.className = 'kc-msg kc-msg--in'

      const bubble = document.createElement('div')
      bubble.className = 'kc-bubble'

      if (isGroup) {
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
      return row
    },

    buildOwnRow(data) {
      const row = document.createElement('div')
      row.id = 'message-' + data.id
      row.className = 'kc-msg kc-msg--out'
      row.setAttribute('x-data', '{ editing: false }')

      // Même structure que celle que le serveur affiche pour mes messages
      row.innerHTML = `
    <div data-delete class="kc-tools">
      <details class="kc-menu">
        <summary aria-label="Options du message">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
        </summary>
        <div class="kc-menu__panel">
          <button type="button" x-on:click="editing = true; $el.closest('details').open = false">Modifier</button>
          <form method="POST" action="/messages/${Number(data.id)}/delete">
            <input type="hidden" name="_csrf" />
            <button type="submit" class="kc-danger">Supprimer</button>
          </form>
        </div>
      </details>
    </div>
    <div class="kc-bubble">
      <p class="kc-msg__text" data-body x-show="!editing"></p>
      <div class="kc-edit" x-show="editing" x-cloak>
        <form method="POST" action="/messages/${Number(data.id)}/update">
          <input type="hidden" name="_csrf" />
          <input type="text" name="content" autocomplete="off" required maxlength="2000" />
          <div class="kc-edit__actions">
            <button type="button" x-on:click="editing = false">Annuler</button>
            <button type="submit" class="kc-edit__ok">Enregistrer</button>
          </div>
        </form>
      </div>
      <div class="kc-msg__meta">
        <span data-time></span>
        <span class="kc-ticks" data-ticks data-id="${Number(data.id)}">✓</span>
      </div>
    </div>
  `

      // Les textes venant de l'utilisateur sont posés comme du texte, jamais comme du code
      row.querySelector('[data-body]').textContent = data.content
      row.querySelector('input[name="content"]').value = data.content
      row.querySelector('[data-time]').textContent = data.time
      for (const field of row.querySelectorAll('input[name="_csrf"]')) {
        field.value = csrfToken
      }

      return row
    },

    async send(event) {
      event.preventDefault()

      const form = event.target
      const input = form.querySelector('input[name="content"]')
      const content = input.value.trim()

      if (!content || this.sending) {
        return
      }
      this.sending = true

      try {
        const response = await fetch(form.action, {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': csrfToken,
          },
          body: JSON.stringify({ content }),
        })

        if (response.ok) {
          input.value = ''
          this.addMessage(await response.json())
          input.focus()
        } else {
          // Envoi classique : la page affichera l'erreur du serveur
          form.submit()
        }
      } catch (error) {
        form.submit()
      } finally {
        this.sending = false
      }
    },
  }
})

Alpine.data('sidebarLive', function (userId, csrfToken) {
  return {
    online: [],
    filter: 'all',
    unreadCount: 0,

    async init() {
      this.countUnread()

      // Quand on envoie un message, la liste doit se mettre à jour
      window.addEventListener('kc:refresh-list', () => this.refreshList())

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

    setFilter(value) {
      this.filter = value
      const list = document.querySelector('.kc-list')
      if (list) {
        list.classList.toggle('kc-list--unread', value === 'unread')
      }
    },

    countUnread() {
      this.unreadCount = document.querySelectorAll('.kc-list .kc-row--has-unread').length
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
            row.classList.remove('kc-row--has-unread')

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

        this.countUnread()
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
