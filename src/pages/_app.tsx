import type { AppProps } from 'next/app'
import 'focus-visible'


import 'styles/index.scss'



export default function _App({ Component, pageProps }: AppProps): JSX.Element {
  return (
    <>
      {/* <SEO /> */}
      <Component {...pageProps} />
    </>
  )
}
