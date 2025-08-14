
import { joinRoom } from 'trystero'
import { useEffect, useState, createContext } from 'react'

export const MPContext = createContext<{ peerPositions: Record<string, [number, number, number]> }>({ peerPositions: {} })
const trysteroConfig = { appId: 'pockit.world' }

export default function MP({ roomId, ui, children }: { roomId: string, ui: any, children: React.ReactNode }) {
  // Suppress 'User-Initiated Abort' RTC errors in the console
  const origConsoleError = console.error
  console.error = function (...args) {
    if (
      args[0]?.error?.name === 'OperationError' &&
      args[0]?.error?.message?.includes('User-Initiated Abort')
    ) {
      // Suppress this error
      return
    }
    origConsoleError.apply(console, args)
  }
  const room = joinRoom(trysteroConfig, roomId)
  const [sendPosition, getPosition] = room.makeAction('position')
  const [myPosition, setMyPosition] = useState<[number, number, number]>([0, 0, 0])
  const [peerPositions, setPeerPositions] = useState<Record<string, [number, number, number]>>({})

  // Chat state
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<Array<{ peer: string, message: string }>>([])
  const [sendChat, getChat] = room.makeAction('chat')

  // Listen for incoming chat messages
  useEffect(() => {
    getChat((message, peer) => {
      if (typeof message === 'string') {
        setChatMessages(msgs => [...msgs, { peer, message }])
      }
    })
  }, [])

  // Send my position to new peers
  room.onPeerJoin(peer => sendPosition(myPosition, peer))
  room.onPeerLeave(peer => {
    setPeerPositions(pos => {
      const newPos = { ...pos }
      delete newPos[peer]
      return newPos
    })
  })


  // Listen for peers sending their positions
  getPosition((position, peer) => {
    if (Array.isArray(position) && position.length === 3 && position.every(n => typeof n === 'number')) {
      setPeerPositions(pos => ({ ...pos, [peer]: position as [number, number, number] }))
    }
  })

  // Listen for local position updates from parent
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const pos = e.detail as [number, number, number]
      setMyPosition(pos)
      sendPosition(pos)
    }
    window.addEventListener('mp-pos', handler as EventListener)
    return () => window.removeEventListener('mp-pos', handler as EventListener)
  }, [])

  return (
    <MPContext.Provider value={{ peerPositions }}>
      {children}
      <ui.In>
        <div style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '8px', fontSize: '12px', zIndex: 1000 }}>
          <div>Peers:</div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {Object.entries(peerPositions).map(([peerId, position]) => (
              <li key={peerId}>
                {peerId}: [{position.map(n => n.toFixed(2)).join(', ')}]
              </li>
            ))}
          </ul>
        </div>

        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 300, background: 'rgba(0,0,0,0.85)', color: '#fff', padding: '8px', fontSize: '14px', zIndex: 1001, borderTopLeftRadius: 8 }}>
          <div style={{ maxHeight: 160, overflowY: 'auto', marginBottom: 6 }}>
            {chatMessages.map((msg, i) => (
              <div key={i} style={{ marginBottom: 2 }}>
                <span style={{ color: '#8cf' }}>{msg.peer}</span>: {msg.message}
              </div>
            ))}
          </div>
          <input
            type="text"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && chatInput.trim()) {
                sendChat(chatInput)
                setChatMessages(msgs => [...msgs, { peer: 'me', message: chatInput }])
                setChatInput('')
              }
            }}
            placeholder="Type a message..."
            style={{ width: '100%', padding: '6px', borderRadius: 4, border: 'none', outline: 'none', fontSize: '14px', background: '#222', color: '#fff' }}
          />
        </div>
      </ui.In>
    </MPContext.Provider>
  )
}

// export const useRoom = (roomConfig: BaseRoomConfig, roomId: string) => {
//   const roomRef = useRef(joinRoom(roomConfig, roomId))
//   const lastRoomIdRef = useRef(roomId)

//   useEffect(() => {
//     if (roomId !== lastRoomIdRef.current) {
//       roomRef.current.leave()
//       roomRef.current = joinRoom(roomConfig, roomId)
//       lastRoomIdRef.current = roomId
//     }

//     return () => {
//       roomRef.current.leave()
//     }
//   }, [roomConfig, roomId])

//   return roomRef.current
// }


// server side

// import {joinRoom} from 'trystero'
// import {RTCPeerConnection} from 'node-datachannel/polyfill'

// const room = joinRoom(
//   {appId: 'your-app-id', rtcPolyfill: RTCPeerConnection},
//   'your-room-name'
// )