import React, { useState, useEffect, useRef } from 'react'
import { 
  Trophy, 
  User, 
  Plus, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Settings, 
  Trash2, 
  X,
  Gift,
  Users,
  Award
} from 'lucide-react'

const DEFAULT_PRIZES = [
  { id: '1', amount: '5000 ETB', slot: 'SLOT #5', r: 'R-1', color: 'from-[#00b080] via-[#007a5e] to-[#004d38]' },
  { id: '2', amount: '2000 ETB', slot: 'SLOT #4', r: 'R-1', color: 'from-[#00a375] via-[#006e54] to-[#004230]' },
  { id: '3', amount: '1000 ETB', slot: 'SLOT #3', r: 'R-2', color: 'from-[#10b981] via-[#059669] to-[#047857]' },
  { id: '4', amount: '500 ETB', slot: 'SLOT #2', r: 'R-3', color: 'from-[#00c27a] via-[#008a56] to-[#005736]' },
  { id: '5', amount: '100 ETB', slot: 'SLOT #1', r: 'R-1', color: 'from-[#008f6b] via-[#00664c] to-[#003d2e]' },
]

const DEFAULT_PARTICIPANTS = [
  { id: 'p1', name: 'Almaz', avatarColor: '#34d399' },
  { id: 'p2', name: 'Bekele', avatarColor: '#60a5fa' },
  { id: 'p3', name: 'Chala', avatarColor: '#f472b6' },
  { id: 'p4', name: 'Desta', avatarColor: '#fbbf24' },
  { id: 'p5', name: 'Etenesh', avatarColor: '#a78bfa' },
  { id: 'p6', name: 'Fikru', avatarColor: '#f87171' },
  { id: 'p7', name: 'Girma', avatarColor: '#2dd4bf' },
  { id: 'p8', name: 'Hirut', avatarColor: '#fb7185' },
  { id: 'p9', name: 'Kassa', avatarColor: '#38bdf8' },
  { id: 'p10', name: 'Lomi', avatarColor: '#fb923c' },
]

const style: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'relative',
    width: '100%',
    minHeight: '100vh',
    background: 'linear-gradient(to bottom, #e3f4ee, #f4faf8, #caebe0)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    userSelect: 'none',
    paddingBottom: 24,
    color: '#1e293b',
    fontFamily: 'sans-serif',
  },
  header: {
    width: '100%',
    maxWidth: 512,
    padding: '20px 24px 0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 50,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 16,
    background: 'linear-gradient(to bottom right, #005c45, #10b981)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  headerTitle: {
    fontWeight: 900,
    color: '#002e21',
    letterSpacing: -0.5,
    fontSize: 18,
    margin: 0,
  },
  headerSub: {
    fontSize: 10,
    color: '#047857',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: 2,
    margin: 0,
  },
  headerActions: {
    display: 'flex',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: 'rgba(255,255,255,0.95)',
    border: '1px solid #d1fae5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#064e3b',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  iconBtnActive: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: '#065f46',
    border: '1px solid #065f46',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  main: {
    position: 'relative',
    width: '100%',
    maxWidth: 512,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 16px',
    minHeight: 480,
  },
  glowBg: {
    position: 'absolute',
    top: '48%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 340,
    height: 340,
    background: 'rgba(52,211,153,0.2)',
    borderRadius: '50%',
    filter: 'blur(70px)',
    pointerEvents: 'none',
    zIndex: 0,
  },
  circlePath: {
    position: 'absolute',
    top: '48%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 310,
    height: 310,
    border: '2px dashed rgba(16,185,129,0.2)',
    borderRadius: '50%',
    pointerEvents: 'none',
    zIndex: 1,
  },
  arena: {
    position: 'relative',
    width: '100%',
    height: 380,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  jarBottomSection: {
    position: 'absolute',
    bottom: 8,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 30,
  },
  lid: {
    position: 'relative',
    cursor: 'pointer',
    transition: 'transform 0.5s ease-out',
    zIndex: 40,
  },
  lidOpen: {
    position: 'relative',
    cursor: 'pointer',
    transition: 'transform 0.5s ease-out',
    zIndex: 40,
    transform: 'translateY(-68px) rotate(-15deg) scale(1.05)',
  },
  lidKnob: {
    width: 32,
    height: 16,
    background: '#004231',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTop: '2px solid #6ee7b7',
    margin: '0 auto',
  },
  lidCap: {
    width: 96,
    height: 20,
    background: '#005C45',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    borderBottom: '4px solid #003829',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
  },
  lidLine: {
    width: 56,
    height: 2,
    background: 'rgba(255,255,255,0.25)',
    borderRadius: 1,
  },
  potWrap: {
    position: 'relative',
    width: 208,
    height: 176,
    marginTop: -6,
  },
  potGlow: {
    position: 'absolute',
    top: -20,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 56,
    height: 24,
    background: 'linear-gradient(to bottom, rgba(52,211,153,0.5), transparent)',
    borderRadius: '50%',
    filter: 'blur(8px)',
    zIndex: 10,
  },
  potBtn: {
    position: 'relative',
    width: '100%',
    height: '100%',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    outline: 'none',
    padding: 0,
  },
  svg: {
    width: '100%',
    height: '100%',
    filter: 'drop-shadow(0 12px 22px rgba(0,0,0,0.35))',
  },
  potTextOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    color: '#fff',
    paddingTop: 40,
    pointerEvents: 'none',
  },
  potLabel: {
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#6ee7b7',
  },
  potAction: {
    fontSize: 16,
    fontWeight: 900,
    textShadow: '0 2px 4px rgba(0,0,0,0.15)',
  },
  resultsPanel: {
    width: '100%',
    maxWidth: 384,
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(16px)',
    borderRadius: 16,
    padding: 16,
    border: '1px solid #d1fae5',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    zIndex: 40,
    marginBottom: 8,
  },
  resultsHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid #f1f5f9',
    paddingBottom: 8,
  },
  resultsHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 10,
    fontWeight: 900,
    color: '#065f46',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultsCount: {
    fontSize: 9,
    fontWeight: 700,
    color: '#065f46',
    background: '#d1fae5',
    padding: '2px 8px',
    borderRadius: 999,
  },
  resultRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 8px',
    borderRadius: 10,
    background: 'rgba(236,253,245,0.5)',
    border: '1px solid rgba(209,250,229,0.5)',
    fontSize: 12,
  },
  resultRowLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  resultAvatar: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 9,
    fontWeight: 900,
  },
  resultName: {
    fontWeight: 800,
    color: '#1e293b',
  },
  resultSlot: {
    fontSize: 10,
    fontWeight: 700,
    color: '#64748b',
    marginRight: 6,
  },
  resultAmount: {
    fontWeight: 900,
    color: '#065f46',
    background: 'rgba(209,250,229,0.7)',
    padding: '2px 8px',
    borderRadius: 6,
    fontSize: 11,
  },
  statusBar: {
    width: '100%',
    textAlign: 'center',
    padding: '8px 0',
    zIndex: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 900,
    color: '#064e3b',
    background: 'rgba(255,255,255,0.7)',
    backdropFilter: 'blur(4px)',
    padding: '6px 16px',
    borderRadius: 999,
    display: 'inline-block',
    border: '1px solid #d1fae5',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  statsWrap: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    marginTop: 'auto',
    zIndex: 10,
  },
  statsBadge: {
    background: '#00966C',
    color: '#fff',
    padding: '8px 32px',
    borderRadius: 999,
    fontWeight: 900,
    fontSize: 12,
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minWidth: 150,
    textAlign: 'center' as const,
    justifyContent: 'center',
  },
  statsBig: {
    color: '#005c45',
    fontWeight: 900,
    fontSize: 20,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  statsSub: {
    color: 'rgba(0,92,69,0.7)',
    fontSize: 9,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  footer: {
    width: '100%',
    maxWidth: 512,
    padding: '4px 24px 0',
    zIndex: 45,
  },
  footerRow: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
  },
  mainBtn: {
    flex: 1,
    padding: '12px 0',
    borderRadius: 16,
    fontWeight: 900,
    fontSize: 12,
    letterSpacing: 0.5,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  resetBtn: {
    padding: '12px 16px',
    borderRadius: 16,
    background: '#fff',
    border: '1px solid #d1fae5',
    color: '#065f46',
    cursor: 'pointer',
    transition: 'all 0.15s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  configOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15,23,42,0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: 50,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: 16,
  },
  configPanel: {
    width: '100%',
    maxWidth: 448,
    background: '#fff',
    borderRadius: 24,
    boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
    overflow: 'hidden',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
  },
  configHeader: {
    padding: 16,
    background: 'linear-gradient(to right, #065f46, #007a5e)',
    color: '#fff',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  configHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    fontWeight: 800,
  },
  configBody: {
    padding: 16,
    overflowY: 'auto',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  configFooter: {
    padding: 12,
    background: '#f8fafc',
    borderTop: '1px solid #f1f5f9',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  formSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  formLabel: {
    display: 'block',
    fontSize: 9,
    fontWeight: 800,
    color: '#64748b',
    marginBottom: 4,
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
  },
  input: {
    width: '100%',
    padding: '6px 10px',
    fontSize: 12,
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    outline: 'none',
    fontWeight: 700,
    boxSizing: 'border-box' as const,
  },
  select: {
    width: '100%',
    padding: '6px 10px',
    fontSize: 12,
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    outline: 'none',
    fontWeight: 700,
    boxSizing: 'border-box' as const,
  },
  addBtn: {
    background: '#065f46',
    color: '#fff',
    padding: '6px 16px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 700,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    height: 34,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  addBtnDisabled: {
    background: '#065f46',
    color: '#fff',
    padding: '6px 16px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 700,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    height: 34,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    opacity: 0.5,
  },
  prizeGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 6,
    maxHeight: 140,
    overflowY: 'auto',
  },
  prizeItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
  },
  prizeItemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  prizeRoundBadge: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: '#065f46',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 8,
    fontWeight: 800,
  },
  prizeInfo: {
    lineHeight: 1.2,
  },
  prizeAmount: {
    fontWeight: 700,
    fontSize: 10,
    color: '#1e293b',
  },
  prizeSlot: {
    fontSize: 8,
    color: '#94a3b8',
    fontWeight: 700,
  },
  deleteBtn: {
    padding: 4,
    color: '#94a3b8',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  doneBtn: {
    background: '#1e293b',
    color: '#fff',
    fontWeight: 700,
    fontSize: 12,
    padding: '8px 20px',
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
}

export function LuckyJarScreen() {
  const [prizes, setPrizes] = useState(DEFAULT_PRIZES)
  const [participants, setParticipants] = useState(DEFAULT_PARTICIPANTS)
  const [isOpen, setIsOpen] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [releasedIndexes, setReleasedIndexes] = useState<number[]>([])
  const [isReleasing, setIsReleasing] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [currentStatusText, setCurrentStatusText] = useState('እንኳን ደህና መጡ! Tap to draw')
  const [revealedWinnersList, setRevealedWinnersList] = useState<{ prize: typeof DEFAULT_PRIZES[0]; winner: typeof DEFAULT_PARTICIPANTS[0] }[]>([])
  const [assignments, setAssignments] = useState<Record<string, typeof DEFAULT_PARTICIPANTS[0]>>({})

  const [newAmount, setNewAmount] = useState('')
  const [newSlot, setNewSlot] = useState('')
  const [newR, setNewR] = useState('R-1')
  const [newParticipantName, setNewParticipantName] = useState('')

  const audioCtxRef = useRef<AudioContext | null>(null)

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }

  const playSound = (type: string) => {
    if (isMuted) return
    try {
      initAudio()
      const ctx = audioCtxRef.current!
      if (ctx.state === 'suspended') ctx.resume()

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)

      if (type === 'lid') {
        osc.type = 'sine'
        osc.frequency.setValueAtTime(320, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(750, ctx.currentTime + 0.3)
        gain.gain.setValueAtTime(0.12, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
        osc.start()
        osc.stop(ctx.currentTime + 0.35)
      } else if (type === 'pop') {
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(180, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(620, ctx.currentTime + 0.22)
        gain.gain.setValueAtTime(0.2, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22)
        osc.start()
        osc.stop(ctx.currentTime + 0.25)
      } else if (type === 'reveal') {
        osc.type = 'sine'
        osc.frequency.setValueAtTime(600, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.35)
        gain.gain.setValueAtTime(0.15, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
        osc.start()
        osc.stop(ctx.currentTime + 0.4)
      } else if (type === 'fanfare') {
        osc.type = 'sine'
        osc.frequency.setValueAtTime(523.25, ctx.currentTime)
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12)
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.24)
        osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.36)
        gain.gain.setValueAtTime(0.15, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7)
        osc.start()
        osc.stop(ctx.currentTime + 0.85)
      } else if (type === 'reset') {
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(400, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.3)
        gain.gain.setValueAtTime(0.1, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
        osc.start()
        osc.stop(ctx.currentTime + 0.35)
      }
    } catch (e) {
      console.warn("Audio Context error ignored", e)
    }
  }

  const getCircularPosition = (index: number, total: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2
    const radius = 155
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius - 45
    return { x, y }
  }

  const handleToggleJar = () => {
    if (isReleasing) return

    if (!isOpen) {
      setIsOpen(true)
      setIsReleasing(true)
      playSound('lid')
      setReleasedIndexes([])
      setRevealedWinnersList([])
      setCurrentStatusText('ዕጣ እየወጣ ነው...')

      const shuffled = [...participants].sort(() => 0.5 - Math.random())
      const newAssignments: Record<string, typeof DEFAULT_PARTICIPANTS[0]> = {}
      prizes.forEach((prize, idx) => {
        newAssignments[prize.id] = shuffled[idx] || { id: `gen-${idx}`, name: `ተወዳዳሪ #${idx + 1}`, avatarColor: '#10b981' }
      })
      setAssignments(newAssignments)

      const totalItems = prizes.length
      let delay = 0
      for (let i = 0; i < totalItems; i++) {
        setTimeout(() => {
          setReleasedIndexes(prev => {
            if (!isOpen && prev.length === 0) return prev
            return [...prev, i]
          })
          const prizeItem = prizes[i]
          const matchedWinner = newAssignments[prizeItem.id]
          if (matchedWinner) {
            playSound('reveal')
            setRevealedWinnersList(prev => [...prev, { prize: prizeItem, winner: matchedWinner }])
            setCurrentStatusText(`🎉 ${matchedWinner.name} won ${prizeItem.amount}!`)
          } else {
            playSound('pop')
          }
          if (i === totalItems - 1) {
            setIsReleasing(false)
            playSound('fanfare')
            setCurrentStatusText('ሁሉም ዕጣዎች ወጥተዋል! እንኳን ደስ አላችሁ! 🥳')
          }
        }, delay)
        delay += 900
      }
    } else {
      playSound('lid')
      setReleasedIndexes([])
      setRevealedWinnersList([])
      setIsOpen(false)
      setCurrentStatusText('እንኳን ደህና መጡ! Tap to open')
    }
  }

  const handleReset = () => {
    playSound('reset')
    setIsOpen(false)
    setReleasedIndexes([])
    setRevealedWinnersList([])
    setIsReleasing(false)
    setCurrentStatusText('እንኳን ደህና መጡ! Tap to open')
  }

  const handleAddPrize = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAmount || !newSlot) return
    const newPrize = {
      id: Date.now().toString(),
      amount: newAmount,
      slot: newSlot,
      r: newR,
      color: ['from-[#00b080] via-[#007a5e] to-[#004d38]', 'from-[#00a375] via-[#006e54] to-[#004230]', 'from-[#10b981] via-[#059669] to-[#047857]'][Math.floor(Math.random() * 3)]
    }
    setPrizes([...prizes, newPrize])
    setNewAmount('')
    setNewSlot('')
    setNewR('R-1')
  }

  const handleAddParticipant = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newParticipantName) return
    const colors = ['#f472b6', '#34d399', '#60a5fa', '#fbbf24', '#a78bfa', '#f87171', '#2dd4bf']
    const newP = {
      id: `custom-p-${Date.now()}`,
      name: newParticipantName,
      avatarColor: colors[Math.floor(Math.random() * colors.length)]
    }
    setParticipants([...participants, newP])
    setNewParticipantName('')
  }

  const floatAnimClass = (index: number) => {
    const classes = ['animate-circle-float-1', 'animate-circle-float-2', 'animate-circle-float-3']
    return classes[index % 3]
  }

  return (
    <div style={style.wrapper}>
      <style>{`
        @keyframes floatCircle1 {
          0% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(-4px, -8px) rotate(1.5deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
        @keyframes floatCircle2 {
          0% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(5px, -5px) rotate(-1.5deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
        @keyframes floatCircle3 {
          0% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(-6px, 4px) rotate(1deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.15; transform: scale(0.95); }
          50% { opacity: 0.45; transform: scale(1.05); }
        }
        @keyframes slideUpIn {
          from { transform: translateY(12px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-circle-float-1 { animation: floatCircle1 4.5s ease-in-out infinite; }
        .animate-circle-float-2 { animation: floatCircle2 3.8s ease-in-out infinite; }
        .animate-circle-float-3 { animation: floatCircle3 5.2s ease-in-out infinite; }
        .animate-glow-pulse { animation: glowPulse 2.8s ease-in-out infinite; }
        .animate-slide-up { animation: slideUpIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      {/* Header */}
      <header style={style.header}>
        <div style={style.headerLeft}>
          <div style={style.logoIcon}>
            <Trophy size={20} />
          </div>
          <div>
            <h1 style={style.headerTitle}>ዕድለኛ ማሰሮ</h1>
            <p style={style.headerSub}>Perfect Circle Draw</p>
          </div>
        </div>
        <div style={style.headerActions}>
          <button
            onClick={() => setIsMuted(!isMuted)}
            style={style.iconBtn}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          <button
            onClick={() => { initAudio(); setShowConfig(!showConfig) }}
            style={showConfig ? style.iconBtnActive : style.iconBtn}
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* Main */}
      <main style={style.main}>
        <div style={{ ...style.glowBg, animation: 'glowPulse 2.8s ease-in-out infinite' }} />

        {isOpen && <div style={{ ...style.circlePath, animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />}

        <div style={style.arena}>
          {prizes.map((prizeItem, index) => {
            const isReleased = releasedIndexes.includes(index)
            const coords = getCircularPosition(index, prizes.length)
            const matchedWinner = assignments[prizeItem.id]
            const startX = 0
            const startY = 120
            const transitionStyle = isOpen
              ? `all 950ms cubic-bezier(0.19, 1, 0.22, 1) ${index * 50}ms`
              : 'opacity 0.15s ease-out, transform 0.15s ease-out'

            return (
              <div
                key={`circular-dice-${prizeItem.id}`}
                style={{
                  position: 'absolute',
                  transform: isReleased && isOpen
                    ? `translate(${coords.x}px, ${coords.y}px)`
                    : `translate(${startX}px, ${startY}px)`,
                  opacity: isReleased && isOpen ? 1 : 0,
                  zIndex: 40,
                  pointerEvents: isReleased && isOpen ? 'auto' : 'none',
                  transition: transitionStyle,
                }}
              >
                <div className={floatAnimClass(index)}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div
                      style={{
                        position: 'relative',
                        width: 84,
                        height: 84,
                        borderRadius: '50%',
                        background: `linear-gradient(to bottom right, ${prizeItem.color.replace('from-', '').replace('via-', ',').replace('to-', ',')})`,
                        border: '2px solid rgba(255,255,255,0.75)',
                        boxShadow: '0 8px 20px rgba(0,40,25,0.35)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        cursor: 'default',
                      }}
                    >
                      <div style={{ position: 'absolute', top: 4, left: 12, width: 48, height: 12, background: 'rgba(255,255,255,0.2)', borderRadius: 6 }} />
                      <span style={{ fontWeight: 900, fontSize: 12, letterSpacing: 0.3 }}>{prizeItem.amount}</span>
                      <span style={{ fontSize: 8, fontWeight: 900, opacity: 0.9, marginTop: 2, letterSpacing: 0.5 }}>{prizeItem.slot}</span>
                      <span style={{ fontSize: 7, background: 'rgba(255,255,255,0.25)', padding: '1px 6px', borderRadius: 8, fontWeight: 700, marginTop: 2 }}>{prizeItem.r}</span>
                    </div>

                    {matchedWinner && (
                      <div style={{
                        marginTop: 6,
                        background: 'rgba(255,255,255,0.95)',
                        padding: '2px 8px',
                        borderRadius: 999,
                        boxShadow: '0 4px 10px rgba(0,0,0,0.12)',
                        border: '1px solid #d1fae5',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}>
                        <div style={{
                          width: 14, height: 14, borderRadius: '50%',
                          background: matchedWinner.avatarColor,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 7, fontWeight: 900,
                        }}>
                          {matchedWinner.name[0]}
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 900, color: '#1e293b', whiteSpace: 'nowrap' }}>
                          {matchedWinner.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Jar */}
          <div style={style.jarBottomSection}>
            <div
              onClick={handleToggleJar}
              style={isOpen ? style.lidOpen : style.lid}
            >
              <div style={style.lidKnob} />
              <div style={style.lidCap}>
                <div style={style.lidLine} />
              </div>
            </div>

            <div style={style.potWrap}>
              {isOpen && <div style={style.potGlow} />}

              <button onClick={handleToggleJar} style={style.potBtn}>
                <svg viewBox="0 0 200 170" style={style.svg}>
                  <defs>
                    <radialGradient id="jarBellyGrad" cx="50%" cy="40%" r="55%">
                      <stop offset="0%" stopColor="#00a86b" />
                      <stop offset="60%" stopColor="#007a5e" />
                      <stop offset="100%" stopColor="#003527" />
                    </radialGradient>
                    <linearGradient id="zigZagGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#34d399" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#004d38" stopOpacity="0.9" />
                    </linearGradient>
                  </defs>
                  <path d="M 65,22 L 135,22 C 142,22 142,32 135,32 L 65,32 C 58,32 58,22 65,22 Z" fill="#005C45" />
                  <path d="M 68,32 L 132,32 C 145,55 178,65 178,105 C 178,145 142,165 100,165 C 58,165 22,145 22,105 C 22,65 55,55 68,32 Z" fill="url(#jarBellyGrad)" />
                  <polyline points="32,80 44,65 56,80 68,65 80,80 92,65 104,80 116,65 128,80 140,65 152,80 164,65 168,80" fill="none" stroke="url(#zigZagGrad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M 50,115 L 70,140 M 60,115 L 80,140 M 70,115 L 90,140" stroke="#ffffff" strokeWidth="2.5" strokeOpacity="0.15" strokeLinecap="round" />
                  <path d="M 150,115 L 130,140 M 140,115 L 120,140 M 130,115 L 110,140" stroke="#ffffff" strokeWidth="2.5" strokeOpacity="0.15" strokeLinecap="round" />
                  <path d="M 35,90 A 60,60 0 0,1 60,45" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.1" />
                </svg>

                <div style={style.potTextOverlay}>
                  <span style={style.potLabel}>{isOpen ? 'TAP TO CLOSE' : 'TAP TO SPIN'}</span>
                  <span style={style.potAction}>{isOpen ? 'ክፍት ነው' : 'እጣ አውጣ'}</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {isOpen && revealedWinnersList.length > 0 && (
          <div style={style.resultsPanel}>
            <div style={style.resultsHeaderRow}>
              <div style={style.resultsHeaderLeft}>
                <Award size={14} />
                <span>ዕጣዎችና አሸናፊዎች (Results Live)</span>
              </div>
              <span style={style.resultsCount}>{revealedWinnersList.length} / {prizes.length}</span>
            </div>
            <div style={{ maxHeight: 110, overflowY: 'auto', paddingRight: 4 }}>
              {revealedWinnersList.map((item, idx) => (
                <div key={idx} style={{ ...style.resultRow, marginBottom: 6 }}>
                  <div style={style.resultRowLeft}>
                    <div style={{ ...style.resultAvatar, background: item.winner.avatarColor }}>
                      {item.winner.name[0]}
                    </div>
                    <span style={style.resultName}>{item.winner.name}</span>
                  </div>
                  <div>
                    <span style={style.resultSlot}>{item.prize.slot}</span>
                    <span style={style.resultAmount}>{item.prize.amount}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status */}
        <div style={style.statusBar}>
          <span style={style.statusText}>{currentStatusText}</span>
        </div>

        {/* Stats */}
        <div style={style.statsWrap}>
          <div style={style.statsBadge}>
            <Users size={14} />
            <span>{participants.length} ተወዳዳሪዎች</span>
          </div>
          <p style={style.statsBig}>{prizes.length} አሸናፊ</p>
          <p style={style.statsSub}>ዕጣ ማውጫ ሰሌዳ</p>
        </div>
      </main>

      {/* Footer */}
      <footer style={style.footer}>
        <div style={style.footerRow}>
          <button
            onClick={handleToggleJar}
            disabled={isReleasing}
            style={{
              ...style.mainBtn,
              background: isOpen ? '#1e293b' : 'linear-gradient(to right, #065f46, #00966C)',
              color: '#fff',
            }}
          >
            {isOpen ? 'ማሰሮውን ዝጋ (CLOSE JAR)' : 'እጣዎችን አውጣ (OPEN & DRAW)'}
          </button>
          <button
            onClick={handleReset}
            style={style.resetBtn}
            title="Reset draw"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </footer>

      {/* Config Panel */}
      {showConfig && (
        <div style={style.configOverlay}>
          <div style={style.configPanel}>
            <div style={style.configHeader}>
              <div style={style.configHeaderLeft}>
                <Settings size={18} />
                <span>Draw Configuration (ቅንብር)</span>
              </div>
              <button onClick={() => setShowConfig(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.85)', cursor: 'pointer', padding: 4, borderRadius: 999 }}>
                <X size={20} />
              </button>
            </div>

            <div style={style.configBody}>
              <form onSubmit={handleAddPrize} style={style.formSection}>
                <h4 style={{ fontWeight: 900, fontSize: 10, color: '#065f46', textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Gift size={14} /> የሽልማት ሰንጠረዥ ማስተካከያ
                </h4>
                <div style={style.formRow}>
                  <div>
                    <label style={style.formLabel}>Price/Amount (የገንዘብ መጠን)</label>
                    <input type="text" placeholder="e.g. 5000 ETB" value={newAmount} onChange={e => setNewAmount(e.target.value)} style={style.input} required />
                  </div>
                  <div>
                    <label style={style.formLabel}>Slot Name (የእጣ ቁጥር)</label>
                    <input type="text" placeholder="e.g. SLOT #5" value={newSlot} onChange={e => setNewSlot(e.target.value)} style={style.input} required />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={style.formLabel}>Round Identifier</label>
                    <select value={newR} onChange={e => setNewR(e.target.value)} style={style.select}>
                      <option value="R-1">R-1 (Round 1)</option>
                      <option value="R-2">R-2 (Round 2)</option>
                      <option value="R-3">R-3 (Round 3)</option>
                      <option value="R-4">R-4 (Round 4)</option>
                    </select>
                  </div>
                  <button type="submit" style={style.addBtn}>
                    <Plus size={14} /> አክል
                  </button>
                </div>
              </form>

              <form onSubmit={handleAddParticipant} style={{ ...style.formSection, paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                <h4 style={{ fontWeight: 900, fontSize: 10, color: '#065f46', textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Users size={14} /> ተወዳዳሪዎች መጨመሪያ ሰሌዳ
                </h4>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={style.formLabel}>Participant Name (የተወዳዳሪ ስም)</label>
                    <input type="text" placeholder="e.g. Yohannes" value={newParticipantName} onChange={e => setNewParticipantName(e.target.value)} style={style.input} />
                  </div>
                  <button type="submit" style={style.addBtn}>
                    <Plus size={14} /> አክል
                  </button>
                </div>
              </form>

              <div style={{ paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h4 style={{ fontWeight: 700, fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Active Prizes ({prizes.length})
                  </h4>
                  <button type="button" onClick={() => setPrizes(DEFAULT_PRIZES)} style={{ fontSize: 9, fontWeight: 700, color: '#065f46', background: 'none', border: 'none', cursor: 'pointer' }}>
                    Reset Defaults
                  </button>
                </div>
                <div style={style.prizeGrid}>
                  {prizes.map((prize) => (
                    <div key={prize.id} style={style.prizeItem}>
                      <div style={style.prizeItemLeft}>
                        <div style={style.prizeRoundBadge}>{prize.r}</div>
                        <div style={style.prizeInfo}>
                          <p style={style.prizeAmount}>{prize.amount}</p>
                          <p style={style.prizeSlot}>{prize.slot}</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => setPrizes(prizes.filter(p => p.id !== prize.id))} style={style.deleteBtn}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={style.configFooter}>
              <button type="button" onClick={() => setShowConfig(false)} style={style.doneBtn}>
                Done (ጨርሻለሁ)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
