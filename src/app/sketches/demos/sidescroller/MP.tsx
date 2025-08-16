
import { joinRoom } from 'trystero'
import { useEffect, useState, useRef, createContext } from 'react'
import PeerList from './PeerList'

type PeerState = { position: [number, number, number], appearance: { [key: string]: any } }
export const MPContext = createContext<{ peerStates: Record<string, PeerState> }>({ peerStates: {} })
const trysteroConfig = { appId: 'pockit.world' }

export default function MP({ roomId, ui, children }: { roomId: string, ui: any, children: React.ReactNode }) {
  // Ref for chat message list
  const chatListRef = useRef<HTMLDivElement>(null)
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
  const [sendPlayerState, getPeerStates] = room.makeAction('peerState')
  const [myState, setMyState] = useState<{ position: [number, number, number], appearance: { [key: string]: any } }>({ position: [0, 0, 0], appearance: {} })
  const [peerStates, setPeerStates] = useState<Record<string, PeerState>>({})

  // Chat state
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<Array<{ peer: string, message: string }>>([])
  const [sendChat, getChat] = room.makeAction('chat')

  // Listen for incoming chat messages
  useEffect(() => {
    getChat((message, peer) => {
      if (typeof message === 'string') {
        if (message.startsWith('/')) {
          const command = message.slice(1).trim().split(' ')[0]
          if (command === 'event') {
            if (peer == roomId) return; // Ignore events from the same room
            const eventData = message.slice(7).trim()
            // Handle room events
            window.dispatchEvent(new CustomEvent('mp-event', { detail: JSON.parse(eventData) }))
            return
          }
        }
        setChatMessages(msgs => [...msgs, { peer, message }])
      }
    })
  }, [])

  // Auto-scroll chat to bottom when messages change
  useEffect(() => {
    if (chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }
  }, [chatMessages])


  // Setup Trystero event listeners for peer join/leave and state updates
  useEffect(() => {
    const handlePeerJoin = (peer: string) => {
      sendPlayerState(myState, peer)
    }
    const handlePeerLeave = (peer: string) => {
      setPeerStates(states => {
        const newStates = { ...states }
        delete newStates[peer]
        return newStates
      })
    }
    const handlePeerState = (state: any, peer: string) => {
      if (
        state &&
        Array.isArray(state.position) &&
        state.position.length === 3 &&
        state.position.every((n: any) => typeof n === 'number') &&
        typeof state.appearance === 'object'
      ) {
        setPeerStates(states => ({ ...states, [peer]: state as PeerState }))
      }
    }
    room.onPeerJoin(handlePeerJoin)
    room.onPeerLeave(handlePeerLeave)
    getPeerStates(handlePeerState)
    // Cleanup: Trystero does not provide off/on removal, but if it did, add here
    // Return cleanup if needed
    // return () => { ... }
  }, [room, sendPlayerState, getPeerStates, myState])

  // Listen for local position updates from parent
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const pos = e.detail as [number, number, number]
      setMyState(state => ({ ...state, position: pos }))
      sendPlayerState({ ...myState, position: pos })
    }
    window.addEventListener('mp-pos', handler as EventListener)
    return () => window.removeEventListener('mp-pos', handler as EventListener)
  }, [myState])

  // Listen for room events from parent, room is stateless
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      sendChat(`/event ${JSON.stringify(e.detail)}`)
    }
    window.addEventListener('mp-trigger', handler as EventListener)
    return () => window.removeEventListener('mp-trigger', handler as EventListener)
  }, [])

  return (
    <MPContext.Provider value={{ peerStates }}>
      {children}
      <ui.In>
        <div className="absolute bottom-0 right-0 bg-black/85 text-white p-2 text-[14px] z-[1001] rounded-tl-lg flex flex-row">
          <button onClick={() => {
            // toggle appearance hand flag
            setMyState(state => {
              const newState = {
                ...state,
                appearance: {
                  ...state.appearance,
                  hand: !state.appearance.hand
                }
              }
              sendPlayerState(newState)
              return newState
            })
          }} className="text-[12px] px-2 py-1 rounded bg-[#333] text-[#8cf] mr-2">
            {myState.appearance.hand ? 'Hide Hand' : 'Show Hand'}
          </button>
          <PeerList
            peerStates={peerStates}
            room={room}
            sendChat={sendChat}
          />
          <div className="flex-1 flex flex-col w-[250px]">
            <div ref={chatListRef} className="max-h-[160px] overflow-y-auto mb-1.5">
              {chatMessages.map((msg, i) => (
                <div key={i} className="mb-0.5">
                  <span className="text-[#8cf]">{msg.peer.slice(0, 8)}</span>: {msg.message}
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
              className="w-full px-1.5 py-1.5 rounded border-none outline-none text-[14px] bg-[#222] text-white"
            />
          </div>
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