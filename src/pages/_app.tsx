import { observer, enableStaticRendering } from "mobx-react";
import React from "react";
import { useServiceProvider } from "react-service-provider";
import { Services } from "~/components/Services";
import "~/components/index.scss";

if (typeof window === "undefined") {
  enableStaticRendering(true);
}

const App = observer(({ Component, pageProps }) => {
  const [ServiceProvider, ServiceProviderHook] = useServiceProvider(
    ...Services
  );
  return (
    <ServiceProvider>
      <ServiceProviderHook>
        <Component {...pageProps} />
      </ServiceProviderHook>
    </ServiceProvider>
  );
});

export default App;
