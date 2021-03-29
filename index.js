const document = require('global/document')
const nanotiming = require('nanotiming')
const morph = require('nanomorph')
const onload = require('on-load')
const assert = require('assert')

const OL_KEY_ID = onload.KEY_ID
const OL_ATTR_ID = onload.KEY_ATTR

/* global window */

function makeID () {
  return `ncid-${Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)}`
}

class Nanocomponent {
  constructor (name) {
    this._hasWindow = typeof window !== 'undefined'
    this._id = null // represents the id of the root node
    this._ncID = null // internal nanocomponent id
    this._olID = null
    this._proxy = null
    this._loaded = false // Used to debounce on-load when child-reordering
    this._rootNodeName = null
    this._name = name || 'nanocomponent'
    this._rerender = false

    this._handleLoad = this._handleLoad.bind(this)
    this._handleUnload = this._handleUnload.bind(this)

    this._arguments = []
  }

  get element () {
    const { _id, _ncID } = this
    const el = document.getElementById(_id)
    if (!el) return
    if (el.dataset.nanocomponent === _ncID) return el
  }

  render (...args) {
    const renderTiming = nanotiming(`${this._name}.render`)

    if (!this._hasWindow) {
      const createTiming = nanotiming(`${this._name}.create`)
      const el = this.createElement(...args)
      createTiming()
      renderTiming()
      return el
    } else if (this.element) {
      const el = this.element // retain reference, as the ID might change on render
      const updateTiming = nanotiming(`${this._name}.update`)
      const shouldUpdate = this._rerender || this.update(...args)
      updateTiming()
      if (this._rerender) this._rerender = false
      if (shouldUpdate) {
        const desiredHtml = this._handleRender(args)
        const morphTiming = nanotiming(`${this._name}.morph`)
        morph(el, desiredHtml)
        morphTiming()
        if (this.afterupdate) this.afterupdate(el)
      }
      if (!this._proxy) { this._proxy = this._createProxy() }
      renderTiming()
      return this._proxy
    } else {
      this._reset()
      const el = this._handleRender(args)
      if (this.beforerender) this.beforerender(el)
      if (this.load || this.unload || this.afterreorder) {
        const { _handleLoad, _handleUnload, _ncID } = this
        onload(el, _handleLoad, _handleUnload, _ncID)
        this._olID = el.dataset[OL_KEY_ID]
      }
      renderTiming()
      return el
    }
  }

  rerender () {
    assert(this.element, 'nanocomponent: cannot rerender on an unmounted dom node')
    this._rerender = true
    this.render(...this._arguments)
  }

  _handleRender (args) {
    const createElementTiming = nanotiming(`${this._name}.createElement`)
    const el = this.createElement(...args)
    createElementTiming()
    if (!this._rootNodeName) this._rootNodeName = el.nodeName
    assert(el instanceof window.Element, 'nanocomponent: createElement should return a single DOM node')
    assert(this._rootNodeName === el.nodeName, 'nanocomponent: root node types cannot differ between re-renders')
    this._arguments = args
    return this._brandNode(this._ensureID(el))
  }

  _createProxy () {
    const proxy = document.createElement(this._rootNodeName)
    const { _id, _ncID } = this
    this._brandNode(proxy)
    proxy.id = _id
    proxy.setAttribute('data-proxy', '')
    proxy.isSameNode = el => el && el.dataset.nanocomponent === _ncID
    return proxy
  }

  _reset () {
    this._ncID = makeID()
    this._olID = null
    this._id = null
    this._proxy = null
    this._rootNodeName = null
  }

  _brandNode (node) {
    node.setAttribute('data-nanocomponent', this._ncID)
    if (this._olID) node.setAttribute(OL_ATTR_ID, this._olID)
    return node
  }

  _ensureID (node) {
    if (node.id) this._id = node.id
    else node.id = this._id = this._ncID
    // Update proxy node ID if it changed
    if (this._proxy && this._proxy.id !== this._id) this._proxy.id = this._id
    return node
  }

  _handleLoad (el) {
    if (this._loaded) {
      if (this.afterreorder) this.afterreorder(el)
      return // Debounce child-reorders
    }
    this._loaded = true
    if (this.load) this.load(el)
  }

  _handleUnload (el) {
    if (this.element) return // Debounce child-reorders
    this._loaded = false
    if (this.unload) this.unload(el)
  }

  createElement () {
    throw new Error('nanocomponent: createElement should be implemented!')
  }

  update () {
    throw new Error('nanocomponent: update should be implemented!')
  }
}

module.exports = Nanocomponent
