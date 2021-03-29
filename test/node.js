const Nanocomponent = require('../')
const test = require('tape')
const html = require('nanohtml')

test('should validate input types', (t) => {
  t.plan(1)
  const comp = new Nanocomponent()
  t.throws(comp.render.bind(comp), /createElement should be implemented/)
})

test('should render elements', (t) => {
  t.plan(2)

  class MyComp extends Nanocomponent {
    createElement (name) {
      return html`<div>${name}</div>`
    }

    update () {
      return false
    }
  }

  const myComp = new MyComp()

  const el1 = myComp.render('mittens')
  t.equal(String(el1), '<div>mittens</div>', 'init render success')

  const el3 = myComp.render('scruffles')
  t.equal(String(el3), '<div>scruffles</div>', 're-render success')
})
