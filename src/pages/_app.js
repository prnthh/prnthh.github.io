import React from "react";
import "styles/global.scss";
import NavbarCustom from "components/NavbarCustom";
import Footer from "components/Footer";
import "util/analytics.js";
import Head from 'next/head'

function MyApp({ Component, pageProps }) {
  return (
    <>
    <Head>
      <title>Prnth.com - Futurist and Hacker</title>
      <meta charset="UTF-8" />
      <meta name="description" content="Homepage of Pranith Hengavalli - Futurist and Hacker" />
      <meta name="keywords" content="Pranith, Hengavalli, prnth, prnth.com, cryptocurrency, game developer, game design" />
      <meta name="author" content="prnth" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </Head>
      <NavbarCustom
        bg="dark"
        variant="dark"
        expand="md"
        logo="https://uploads.divjoy.com/logo.svg"
      />

      <Component {...pageProps} />

      <Footer
        bg="dark"
        textColor="light"
        size="sm"
        bgImage=""
        bgImageOpacity={1}
        description="A short description of what you do here"
        copyright="© 2020 Company"
        logo="https://uploads.divjoy.com/logo.svg"
      />
    </>
  );
}

export default MyApp;
