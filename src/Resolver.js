function NO_OP () {}

module.exports = class Resolver extends Promise {
  constructor (resolver = NO_OP) {
    super((resolve, reject) => {
      this._resolver = resolve
      this._rejecter = reject

      resolver(this.resolve, this.reject)
    })
  }

  resolve (value) {
    this._resolver(value)
  }

  reject (err) {
    this._rejecter(err)
  }
}
