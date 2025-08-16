
import { joinRoom } from 'trystero'
import { useEffect, useState, useRef, createContext } from 'react'

export const MPContext = createContext<{ peerPositions: Record<string, [number, number, number]> }>({ peerPositions: {} })
const trysteroConfig = { appId: 'pockit.world' }

export default function MP({ roomId, ui, children }: { roomId: string, ui: any, children: React.ReactNode }) {
  // Peer options state
  // DM modal state
  // DM input state
  const [peerOptions, setPeerOptions] = useState<string | null>(null)
  const [showDM, setShowDM] = useState<string | null>(null)
  const [dmInput, setDmInput] = useState('')
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
  const [sendPosition, getPosition] = room.makeAction('position')
  const [myPosition, setMyPosition] = useState<[number, number, number]>([0, 0, 0])
  const [peerPositions, setPeerPositions] = useState<Record<string, [number, number, number]>>({})

  // Chat state
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<Array<{ peer: string, message: string }>>([])
  const [sendChat, getChat] = room.makeAction('chat')

  // Helper to send chat and update local state
  const sendLocalChat = (message: string, peer?: string) => {
    sendChat(message, peer)
    setChatMessages(msgs => [...msgs, { peer: peer || 'me', message }])
  }

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


  // Setup Trystero event listeners for peer join/leave and position updates
  useEffect(() => {
    const handlePeerJoin = (peer: string) => {
      sendPosition(myPosition, peer)
    }
    const handlePeerLeave = (peer: string) => {
      setPeerPositions(pos => {
        const newPos = { ...pos }
        delete newPos[peer]
        return newPos
      })
    }
    const handlePosition = (position: any, peer: string) => {
      if (Array.isArray(position) && position.length === 3 && position.every(n => typeof n === 'number')) {
        setPeerPositions(pos => ({ ...pos, [peer]: position as [number, number, number] }))
      }
    }
    room.onPeerJoin(handlePeerJoin)
    room.onPeerLeave(handlePeerLeave)
    getPosition(handlePosition)
    // Cleanup: Trystero does not provide off/on removal, but if it did, add here
    // Return cleanup if needed
    // return () => { ... }
  }, [room, sendPosition, getPosition, myPosition])

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

  // Listen for room events from parent, room is stateless
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      console.log('Received mp-trigger event:', e.detail)
      sendLocalChat(`/event ${JSON.stringify(e.detail)}`)
    }
    window.addEventListener('mp-trigger', handler as EventListener)
    return () => window.removeEventListener('mp-trigger', handler as EventListener)
  }, [])

  return (
    <MPContext.Provider value={{ peerPositions }}>
      {children}
      <ui.In>
        <div className="absolute bottom-0 right-0 w-[300px] bg-black/85 text-white p-2 text-[14px] z-[1001] rounded-tl-lg flex flex-row">
          <div className="min-w-[100px] mr-3 border-r border-[#444] pr-2">
            <div className="font-bold mb-1">Peers:</div>
            <ul className="list-none m-0 p-0">
              {Object.entries(peerPositions).map(([peerId, position]) => (
                <li key={peerId} className="text-[12px] mb-0.5 relative">
                  {peerId.slice(0, 8)}
                  <button
                    className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-[#333] text-[#8cf] border-none cursor-pointer"
                    onClick={e => {
                      e.stopPropagation();
                      setPeerOptions(peerId);
                    }}
                  >
                    &#x22EE;
                  </button>
                  {peerOptions === peerId && (
                    <div className="absolute right-0 bottom-[18px] bg-[#222] border border-[#444] rounded-lg z-[1002] min-w-[80px]">
                      <button
                        className="block w-full bg-none text-[#8cf] border-none px-1.5 py-1.5 text-left cursor-pointer"
                        onClick={() => {
                          setShowDM(peerId);
                          setPeerOptions(null);
                        }}
                      >DM</button>
                      <button
                        className="block w-full bg-none text-[#f88] border-none px-1.5 py-1.5 text-left cursor-pointer"
                        onClick={() => {
                          try {
                            const peerConn = room.getPeers()[peerId];
                            if (peerConn) peerConn.close();
                          } catch (err) { }
                          setPeerOptions(null);
                        }}
                      >Kick</button>
                    </div>
                  )}
                </li>
              ))}
              {showDM && (
                <div className="fixed left-0 top-0 w-screen h-screen bg-black/50 z-[2000] flex items-center justify-center" onClick={() => setShowDM(null)}>
                  <div className="bg-[#222] p-5 rounded-xl min-w-[300px]" onClick={e => e.stopPropagation()}>
                    <div className="mb-2.5 text-[#8cf]">DM to {showDM.slice(0, 8)}</div>
                    <input
                      type="text"
                      autoFocus
                      className="w-full p-2 rounded border-none bg-[#333] text-white mb-2.5"
                      value={dmInput}
                      onChange={e => setDmInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && dmInput.trim()) {
                          sendChat(dmInput, showDM);
                          setShowDM(null);
                          setDmInput('');
                        }
                      }}
                      placeholder="Type a DM..."
                    />
                    <button className="bg-[#8cf] text-[#222] border-none rounded px-3 py-1 cursor-pointer" onClick={() => {
                      if (dmInput.trim()) {
                        sendChat(dmInput, showDM);
                        setShowDM(null);
                        setDmInput('');
                      }
                    }}>Send</button>
                  </div>
                </div>
              )}
            </ul>
          </div>
          <div className="flex-1 flex flex-col">
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
                  sendLocalChat(chatInput)
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