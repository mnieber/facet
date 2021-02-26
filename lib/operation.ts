import { options } from "../internal/options";
import { symbols } from "../internal/symbols";
import { log } from "../internal/logging";
import { sendEvent } from "../internal/events";
import { host } from "aspiration";

export function operation(operationHost, operationMember, descriptor) {
  host(operationHost, operationMember, descriptor);
  const f = descriptor.value;

  function getHandler(facet) {
    const handlers = facet[symbols.operationHandlers];
    return handlers && handlers[operationMember]
      ? handlers[operationMember]
      : f;
  }

  function pre(facet, args) {
    options.logging && log(facet, operationMember, args, true);
    sendEvent(facet, operationMember, args, false);
  }

  function post(facet, args) {
    sendEvent(facet, operationMember, args, true);
    options.logging && log(facet, operationMember, args, false);
  }

  if (typeof descriptor.value === "function") {
    descriptor.value = function (...args) {
      pre(this, args);

      const handler = getHandler(this).bind(this);
      const returnValue = handler(...args);

      post(this, args);
      return returnValue;
    };
  }

  return descriptor;
}

export function async_opn(operationHost, operationMember, descriptor) {
  const f = descriptor.value;
  if (typeof descriptor.value === "function") {
    descriptor.value = async function (...args) {
      const facet = this;

      options.logging && log(facet, operationMember, args, true);
      sendEvent(facet, operationMember, args, false);

      const handlers = facet[symbols.operationHandlers];
      const returnValue =
        handlers && handlers[operationMember]
          ? await handlers[operationMember](...args)
          : await f.bind(this)(...args);

      sendEvent(facet, operationMember, args, true);
      options.logging && log(facet, operationMember, args, false);

      return Promise.resolve(returnValue);
    };
  }
  return descriptor;
}
