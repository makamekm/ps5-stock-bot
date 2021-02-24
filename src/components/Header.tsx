import React from "react";
import Head from "next/head";

export const Header: React.FC = () => (
  <Head>
    <title>The best web site ever!</title>
    <meta name="viewport" content="initial-scale=1.0, width=device-width" />
    <link rel="stylesheet" href="asset/tailwind.generated.css" />
  </Head>
);
