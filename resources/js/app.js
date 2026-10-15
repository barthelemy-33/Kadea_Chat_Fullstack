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

Alpine.data('chatRoom', function (channel, csrfToken, me) {
  return {
    async init() {
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
        } else if (data.type === 'member_added' || data.type === 'member_removed') {
          this.membersChanged(data)
        } else {
          this.addMessage(data)
        }
      })
    },

    addMessage(data) {
      if (this.$refs.empty) {
        this.$refs.empty.remove()
      }

      const wrapper = document.createElement('div')
      wrapper.style.marginBottom = '12px'

      const name = document.createElement('strong')
      name.textContent = data.senderName

      const time = document.createElement('small')
      time.textContent = ' ' + data.time

      const content = document.createElement('p')
      content.textContent = data.content

      wrapper.id = 'message-' + data.id
      content.setAttribute('data-body', '')

      wrapper.append(name, time, content)
      this.$refs.list.appendChild(wrapper)
    },
    markDeleted(data) {
      const block = document.getElementById('message-' + data.id)
      if (!block) {
        return
      }

      const body = block.querySelector('[data-body]')
      const indication = document.createElement('em')
      indication.textContent = 'Ce message a été supprimé le ' + data.deletedAt
      body.replaceChildren(indication)

      const deleteButton = block.querySelector('[data-delete]')
      if (deleteButton) {
        deleteButton.remove()
      }
    },
    membersChanged(data) {
      // Si c'est moi qui ai fait l'action, ma page se recharge déjà
      if (data.by === me) {
        return
      }

      // Si c'est moi qui suis retiré je quitte la page
      if (data.type === 'member_removed' && data.userId === me) {
        window.location.href = '/dashboard'
        return
      }

      // Sinon la liste des membres a changé on recharge
      window.location.reload()
    },
  }
})

Alpine.data('dashboardLive', function (channel, csrfToken) {
  return {
    async init() {
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

      subscription.onMessage(() => {
        window.location.reload()
      })
    },
  }
})

Alpine.start()
