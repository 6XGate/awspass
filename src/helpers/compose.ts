import type { Simplify } from 'type-fest'

type ComposedCallable<Callee, Data, Methods> = Simplify<Callee & Data & Methods>

type DefaultData = object
type DefaultCallee<C> = (this: C, ...args: unknown[]) => unknown
type DefaultMethods<C> = Record<string, (this: C, ...args: unknown[]) => unknown>

interface ComposeOptions<
  Callee = DefaultCallee<object>,
  Data = DefaultData,
  Methods = DefaultMethods<object>
> {
  call: Callee
  data?: Data
  methods?: Methods
}

type ThisTypedComposeOptions<Callee, Data, Methods> =
  ComposeOptions<Callee, Data, Methods> & ThisType<ComposedCallable<Callee, Data, Methods>>

export function compose<Callee, Data, Methods> ({ call, data, methods }: ThisTypedComposeOptions<Callee, Data, Methods>): ComposedCallable<Callee, Data, Methods> {
  if (typeof call !== 'function') {
    throw TypeError('call must be a function')
  }

  const wrapper = (...args: unknown[]): unknown => {
    return call.call(wrapper, ...args)
  }

  if (data != null) {
    Object.defineProperties(wrapper, Object.getOwnPropertyDescriptors(data))
  }

  if (methods != null) {
    Object.defineProperties(wrapper, Object.getOwnPropertyDescriptors(methods))
  }

  return wrapper as unknown as ComposedCallable<Callee, Data, Methods>
}
