import { processOptions, throttle } from '../utils'

class VisibilityState {
	constructor (el, options, vnode) {
		this.el = el
		this.observer = null
		this.createObserver(options, vnode)
	}

	get threshold () {
		return (this.options.intersection && this.options.intersection.threshold) || 0
	}

	createObserver (options, vnode) {
		if (this.observer) {
			this.destroyObserver()
		}

		this.options = processOptions(options)

		this.callback = this.options.callback
		// Throttle
		if (this.callback && this.options.throttle) {
			this.callback = throttle(this.callback, this.options.throttle)
		}

		this.observer = new IntersectionObserver(entries => {
			var entry = entries[0]
			var isIntersecting = entry.isIntersecting && entry.intersectionRatio >= this.threshold

			if (this.callback) {
				// Use isIntersecting if possible because browsers can report isIntersecting as true, but intersectionRatio as 0, when something very slowly enters the viewport.
				this.callback(isIntersecting, entry)
			}
			if (isIntersecting && this.options.once) {
				this.observer.unobserve(this.el)
				this.destroyObserver()
				delete this.el._vue_visibilityState
			}
		}, this.options.intersection)

		// Wait for the element to be in document
		vnode.context.$nextTick(() => {
			this.observer.observe(this.el)
		})
	}

	destroyObserver () {
		if (this.observer) {
			this.observer.disconnect()
		}

		// Cancel throttled call
		if (this.callback && this.callback._clear) {
			this.callback._clear()
		}
	}
}

export default {
	bind (el, {value, modifiers}, vnode) {
		if (typeof IntersectionObserver === 'undefined') {
			console.warn('[vue-observe-visibility] IntersectionObserver API is not available in your browser. Please install this polyfill: https://github.com/w3c/IntersectionObserver/tree/master/polyfill')
		} else {
			const options = {
				value: value,
				once: 'once' in modifiers ? modifiers.once : false,
			}
			el._vue_visibilityState = new VisibilityState(el, options, vnode)
		}
	},

	update (el, {value, modifiers}, vnode) {
		const state = el._vue_visibilityState
		if (state) {
			state.createObserver(value, vnode)
		} else {
			const options = {
				value: value,
				once: 'once' in modifiers ? modifiers.once : false,
			}
			this.bind(el, options, vnode)
		}
	},

	unbind (el) {
		const state = el._vue_visibilityState
		if (state) {
			state.destroyObserver()
			delete el._vue_visibilityState
		}
	},
}
