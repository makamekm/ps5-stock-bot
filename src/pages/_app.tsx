import { observer, enableStaticRendering } from "mobx-react";
import React from "react";
import { useServiceProvider } from "react-service-provider";
import "~/components/index.scss";
import { Services } from "~/components/Services";
import { Header } from "~/components/Header";

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
        <Header />
        <Component {...pageProps} />
      </ServiceProviderHook>
    </ServiceProvider>
  );
});

export default App;
