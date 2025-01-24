import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Add base tag for client-side routing in static export */}
        <base href="/" />
        {/* Add any additional meta tags, fonts, or other head elements */}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
} 