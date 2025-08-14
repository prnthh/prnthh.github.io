import { BaseRoomConfig, joinRoom } from 'trystero'
import { useEffect, useRef, useState } from 'react'

const trysteroConfig = { appId: 'pockit.world' }

export default function MP({ roomId }: { roomId: string }) {
  const room = joinRoom(trysteroConfig, roomId)
  const [sendColor, getColor] = room.makeAction('color')
  const [myColor, setMyColor] = useState('#c0ffee')
  const [peerColors, setPeerColors] = useState<Record<string, string>>({})

  // whenever new peers join the room, send my color to them:
  room.onPeerJoin(peer => sendColor(myColor, peer))
  room.onPeerLeave(peer => {
    setPeerColors(peerColors => {
      const newColors = { ...peerColors }
      delete newColors[peer]
      return newColors
    })
  })

  // listen for peers sending their colors and update the state accordingly:
  getColor((color, peer) => {
    if (typeof color === 'string') {
      setPeerColors(peerColors => ({ ...peerColors, [peer]: color }))
    }
  })

  interface UpdateColorEvent {
    target: {
      value: string
    }
  }

  const updateColor = (e: UpdateColorEvent) => {
    const { value } = e.target

    // when updating my own color, broadcast it to all peers:
    sendColor(value)
    setMyColor(value)
  }

  return (
    <>
      <h2>My color:</h2>
      <input type="color" value={myColor} onChange={updateColor} />

      <h2>Peer colors:</h2>
      <ul>
        {Object.entries(peerColors).map(([peerId, color]) => (
          <li key={peerId} style={{ backgroundColor: color }}>
            {peerId}: {color}
          </li>
        ))}
      </ul>
    </>
  )
}

export const useRoom = (roomConfig: BaseRoomConfig, roomId: string) => {
  const roomRef = useRef(joinRoom(roomConfig, roomId))
  const lastRoomIdRef = useRef(roomId)

  useEffect(() => {
    if (roomId !== lastRoomIdRef.current) {
      roomRef.current.leave()
      roomRef.current = joinRoom(roomConfig, roomId)
      lastRoomIdRef.current = roomId
    }

    return () => {
      roomRef.current.leave()
    }
  }, [roomConfig, roomId])

  return roomRef.current
}


// server side

// import {joinRoom} from 'trystero'
// import {RTCPeerConnection} from 'node-datachannel/polyfill'

// const room = joinRoom(
//   {appId: 'your-app-id', rtcPolyfill: RTCPeerConnection},
//   'your-room-name'
// )