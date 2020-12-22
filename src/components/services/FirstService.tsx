import { createService } from "react-service-provider";
import { useLocalObservable } from "mobx-react";

export const FirstService = createService(() => {
  const service = useLocalObservable(() => ({
    counter: 0,
    get isCounterBigger5() {
      return service.counter > 5;
    },
    limitCounter: () => {
      if (service.isCounterBigger5) {
        service.counter = 0;
      }
    },
  }));
  return service;
});
