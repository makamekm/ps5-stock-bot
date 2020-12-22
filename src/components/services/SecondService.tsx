import React from "react";
import { createService } from "react-service-provider";
import { useLocalObservable } from "mobx-react";
import { FirstService } from "./FirstService";

export const SecondService = createService(
  () => {
    const service = useLocalObservable(() => ({
      firstService: null as any,
      get counterValue() {
        return service.firstService.counter;
      },
      get counter() {
        return service.firstService.counter > 5;
      },
      increaseCounter: () => {
        service.firstService.counter++;
        service.firstService.limitCounter();
      },
    }));
    return service;
  },
  (service) => {
    service.firstService = React.useContext(FirstService);
  }
);
