import React, { useEffect, useRef, useState } from 'react'
import { useGesture } from 'react-use-gesture'

// eslint-disable-next-line
import SeatsWorker from '../utils/seats.worker'

// svg bounding rect
// svg initial size -> minScale, maxScale...
// drag bounds rubberband

const TargetTypes = {
  AREA: 'area',
  SEAT: 'seat',
}

export default function App() {
  return (
    <SVG>
      <g id='overview'></g>
      <g id='seats'></g>
    </SVG>
  )
}

function SVG({ children, id }) {
  ////////// network condition
  const isFastConnection = useRef(false)

  useEffect(() => {
    let connectionType = ''
    let saveData = false

    if (
      !global.navigator ||
      !global.navigator ||
      !global.navigator.connection
    ) {
      connectionType = '3g'
    } else {
      connectionType = global.navigator.connection.effectiveType || '3g'
      saveData = global.navigator.connection.saveData
    }

    if (!connectionType.includes('2g') && !saveData) {
      isFastConnection.current = true
    }
  }, [])

  ////////// transform
  const [svgProps, setSvgProps] = useState({})

  const svgRef = useRef()
  const seatAreaNodes = useRef({})

  const transform = useRef({ x: 0, y: 0, scale: 1 })
  const minScale = useRef(1)
  const maxScale = useRef(2)
  const defaultScaleChange = useRef(0.5)
  const scaleThreshold = useRef(1.5)

  ////////// web worker
  const seatsWorker = useRef()

  useEffect(() => {
    seatsWorker.current = new SeatsWorker()

    seatsWorker.current
      .fetchOverviewMap(id)
      .then(({ svgProps: { width, height }, overviewHtml }) => {
        setSvgProps({ width, height, viewBox: `0 0 ${width} ${height}` })

        const overviewNode = document.getElementById('overview')
        overviewNode.innerHTML = overviewHtml

        for (const areaNode of overviewNode.children) {
          if (!areaNode.id) continue

          seatAreaNodes.current[areaNode.id] = document
            .getElementById('seats')
            .appendChild(
              document.createElementNS('http://www.w3.org/2000/svg', 'g')
            )
        }

        // TODO measure svgRef vs real size
        const seatSize = 2

        maxScale.current = 44 / seatSize // 22
        defaultScaleChange.current = 1 / seatSize
        minScale.current = 1 - defaultScaleChange.current / 10
        console.log(defaultScaleChange.current)
        scaleThreshold.current = (maxScale.current + minScale.current) / 3
      })

    return () => {
      seatsWorker.current.terminate()
    }
  }, [id])

  ////////// gesture handler
  // const isInteracting = useRef(false)
  const zoomOrigin = useRef([0, 0])

  function calculateTransform([clientX, clientY], scaleChange) {
    const { x: currentX, y: currentY, scale: currentScale } = transform.current

    const nextScale = clamp(
      currentScale + scaleChange,
      minScale.current,
      maxScale.current
    )

    const scaleRatio = nextScale / currentScale

    const focalX = clientX - currentX
    const focalY = clientY - currentY

    const focalDeltaX = scaleRatio * focalX - focalX
    const focalDeltaY = scaleRatio * focalY - focalY

    return {
      x: currentX - focalDeltaX,
      y: currentY - focalDeltaY,
      scale: nextScale,
    }
  }

  function updateSVGTransform() {
    const { x, y, scale } = transform.current

    svgRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) scale3d(${scale}, ${scale}, 1)`
  }

  const fetchArea = memoize(
    function (areaId) {
      return seatsWorker.current.fetchArea(areaId)
    },
    (...args) => args[0]
    // 30000
  )

  const prefetchedArea = useRef(new Map())
  const areaVisibility = useRef(new Map())
  const renderedAreas = useRef(new Map())

  function prefetchAreaSeatsOnZoomingIn() {
    // TODO
    // if (isFastConnection.current) {
    // } else {
    // }
    const [x, y] = zoomOrigin.current

    for (const areaNode of document.getElementById('overview').children) {
      const areaId = areaNode.id
      if (!areaId || prefetchedArea.current[areaId]) continue

      const { top, left, bottom, right } = areaNode.getBoundingClientRect()

      // prefetch mouseover area
      if (top < y && left < x && bottom > y && right > x) {
        fetchArea(areaId).catch(() => console.log('OOPS 1'))
        break
      }
    }
  }

  function handleGestureEnd() {
    const isPastThreshold = transform.current.scale >= scaleThreshold.current

    for (const areaNode of document.getElementById('overview').children) {
      const areaId = areaNode.id
      if (!areaId) continue

      let isVisible = false

      if (isPastThreshold) {
        const { top, left, bottom, right } = areaNode.getBoundingClientRect()

        isVisible =
          top < (window.innerHeight || document.documentElement.clientHeight) &&
          left < (window.innerWidth || document.documentElement.clientWidth) &&
          bottom > 0 &&
          right > 0
      }

      areaVisibility.current.set(areaId, isVisible)

      if (isVisible) {
        fetchArea(areaId)
          .then((areaHtml) => {
            if (
              areaVisibility.current.get(areaId) &&
              !renderedAreas.current.get(areaId)
            ) {
              renderedAreas.current.set(areaId, true)

              seatAreaNodes.current[areaId].innerHTML = areaHtml
              document.getElementById(areaId).classList.toggle('hidden', true)
            }
          })
          // TODO handle error
          .catch((e) => console.log(e))
      } else {
        if (renderedAreas.current.get(areaId) !== false) {
          renderedAreas.current.set(areaId, false)

          seatAreaNodes.current[areaId].innerHTML = ''
          document.getElementById(areaId).classList.toggle('hidden', false)
        }
      }
    }

    // let timeoutId

    // if (isVisible) {
    //   timeoutId = setTimeout(() => {
    //     document
    //       .getElementById('seat-wrapper')
    //       .classList.toggle('loading', true)
    //   }, 100)
    // }
    // document
    //   .getElementById('seat-wrapper')
    //   .classList.toggle('loading', false)
  }

  const bind = useGesture(
    {
      onDrag: ({ delta, last }) => {
        // isInteracting.current = !last
        if (last) return handleGestureEnd()

        const { x, y, scale } = transform.current
        transform.current = { x: x + delta[0], y: y + delta[1], scale }
        updateSVGTransform()
      },
      onPinch: ({ direction, first, last, origin }) => {
        // TODO should not need direction here
        // isInteracting.current = !last
        const isZoomingIn = direction[0] > 0

        if (first) {
          zoomOrigin.current = origin
          isZoomingIn && prefetchAreaSeatsOnZoomingIn()
        }

        if (last) return handleGestureEnd()

        // TODO pinch offset
        // needs interpolate
        // [minScale.current, 100, maxScale.current]
        // [offset * speed,0,offset*speed]
        // use options distance bounds below

        transform.current = calculateTransform(
          zoomOrigin.current,
          isZoomingIn ? 0.4 : -0.4
        )
        updateSVGTransform()
      },
      onWheel: ({ delta, event, first, last }) => {
        // isInteracting.current = !last
        const isZoomingIn = delta[1] < 0

        if (first) {
          zoomOrigin.current = [event.clientX, event.clientY]
          isZoomingIn && prefetchAreaSeatsOnZoomingIn()
        }

        if (last) return handleGestureEnd()

        const multiplier = isZoomingIn ? 1 : -1

        transform.current = calculateTransform(
          zoomOrigin.current,
          multiplier * defaultScaleChange.current
        )
        updateSVGTransform()
      },
    },
    {
      // TODO probably need states
      // drag: { bounds: {}, rubberband: true },
      // pinch: { distanceBounds: { max: 1, min: 1 } },
      wheel: { axis: 'y' },
    }
  )

  // useEffect(() => {
  //   // only render when user interacting
  //   let id

  //   function updateSVGTransform() {
  //     if (svgRef.current && isInteracting.current) {
  //       const { x, y, scale } = transform.current

  //       svgRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`
  //     }

  //     id = requestAnimationFrame(updateSVGTransform)
  //   }

  //   updateSVGTransform()

  //   return () => {
  //     cancelAnimationFrame(id)
  //   }
  // }, [])

  function handleClick(e) {
    const targetType = ''
    const id = e.target.id

    switch (targetType) {
      case TargetTypes.AREA:
        if (isFastConnection.current) {
        } else {
        }
        break
      case TargetTypes.SEAT:
        break
      default:
      // throw new Error('Unsupported target type.')
    }
  }

  return (
    <div id='seat-wrapper' {...bind()}>
      <div className='Spinner' />
      <svg
        ref={svgRef}
        fill='none'
        // width='6356'
        // height='4271'
        // viewBox='0 0 6356 4271'
        onClick={handleClick}
        xmlns='http://www.w3.org/2000/svg'
        {...svgProps}
      >
        {children}
      </svg>
    </div>
  )
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function memoize(func, keyResolver, timeout = Infinity) {
  const cache = new Map()
  const inProgress = new Map()

  if (isNaN(timeout)) throw new Error('Invalid timeout argument!')
  if (timeout < 0) timeout = 0

  return async function () {
    const key = keyResolver.apply(null, arguments)

    if (cache.has(key)) {
      return cache.get(key)
    }
    // promisify

    let promise

    try {
      if (inProgress.has(key)) {
        promise = inProgress.get(key)
      } else {
        promise = Promise.resolve(func.apply(null, arguments))

        inProgress.set(key, promise)
      }

      const result = await promise

      inProgress.delete(key)
      cache.set(key, result)

      timeout !== Infinity &&
        setTimeout(() => {
          cache.delete(key)
        }, timeout)

      return result
    } catch (e) {
      inProgress.delete(key)
      throw new Error('')
    }
  }
}

// const query = `{
//   Movie(title: "Inception") {
//     releaseDate
//     actors {
//       name
//     }
//   }
// }`

// function queryResolver(query, variables) {
//   return graphqlRequest('https://graphql.fauna.com/graphql', query, variables)
// }
