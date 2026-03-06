'use client'

import { useState, useRef, useCallback } from 'react'

interface Arrow {
  id: number
  landed: boolean
  score: number
  x: number
  y: number
}

interface DragState {
  isDragging: boolean
  startX: number
  startY: number
  currentX: number
  currentY: number
}

export function TargetGame() {
  const [arrows, setArrows] = useState<Arrow[]>([])
  const [flyingArrow, setFlyingArrow] = useState<{
    x: number
    y: number
    rotation: number
    visible: boolean
  } | null>(null)
  const [drag, setDrag] = useState<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  })
  const [isEndComplete, setIsEndComplete] = useState(false)
  const [arrowIdCounter, setArrowIdCounter] = useState(0)
  const [trajectory, setTrajectory] = useState<{ x: number; y: number }[]>([])
  
  const containerRef = useRef<HTMLDivElement>(null)

  // Game dimensions
  const GAME_WIDTH = 400
  const GAME_HEIGHT = 260
  const BOW_X = 60
  const BOW_Y = 150
  const TARGET_X = 320
  const TARGET_Y = 150
  const TARGET_WIDTH = 95
  const TARGET_HEIGHT = 130
  const BOW_SCALE = 1.4

  const calculateScore = useCallback((x: number, y: number): number => {
    // Calculate distance from target center (normalized 0-1 where 1 is edge)
    const centerX = TARGET_X
    const centerY = TARGET_Y
    const dx = (x - centerX) / (TARGET_WIDTH / 2)
    const dy = (y - centerY) / (TARGET_HEIGHT / 2)
    const normalizedDist = Math.sqrt(dx ** 2 + dy ** 2)
    
    // Standard archery target scoring rings (each color = 2 scores)
    // Yellow (Gold): 10, 9 - outer 20% of target (80%-100% from center)
    // Red: 8, 7 - 60%-80%
    // Blue: 6, 5 - 40%-60%
    // Black: 4, 3 - 20%-40%
    // White: 2, 1 - 0%-20%
    // X ring: inner 10% for tiebreakers
    
    if (normalizedDist <= 0.1) return 10   // Inner X ring
    if (normalizedDist <= 0.2) return 9    // Outer yellow
    if (normalizedDist <= 0.4) return 8    // Inner red
    if (normalizedDist <= 0.6) return 7    // Outer red
    if (normalizedDist <= 0.7) return 6    // Inner blue
    if (normalizedDist <= 0.8) return 5    // Outer blue
    if (normalizedDist <= 0.85) return 4   // Inner black
    if (normalizedDist <= 0.9) return 3    // Outer black
    if (normalizedDist <= 0.95) return 2   // Inner white
    if (normalizedDist <= 1.0) return 1    // Outer white
    return 0  // Miss
  }, [])

  // Calculate trajectory points
  const calculateTrajectory = useCallback((pullX: number, pullY: number) => {
    const power = Math.min(Math.sqrt((pullX - BOW_X) ** 2 + (pullY - BOW_Y) ** 2), 100)
    const angle = Math.atan2(BOW_Y - pullY, BOW_X - pullX)
    
    const velocity = power * 0.28
    const vx = Math.cos(angle) * velocity
    const vy = Math.sin(angle) * velocity
    
    const points: { x: number; y: number }[] = []
    let x = BOW_X
    let y = BOW_Y
    let vy_curr = vy
    
    for (let i = 0; i < 25; i++) {
      x += vx * 2
      y += vy_curr * 2
      vy_curr += 0.25 // gravity
      points.push({ x, y })
      if (x > GAME_WIDTH || y > GAME_HEIGHT) break
    }
    
    return points
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isEndComplete) {
      setArrows([])
      setIsEndComplete(false)
      return
    }
    if (arrows.length >= 3) return

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Only start drag if near bow
    const distToBow = Math.sqrt((x - BOW_X) ** 2 + (y - BOW_Y) ** 2)
    if (distToBow > 80) return

    setDrag({
      isDragging: true,
      startX: x,
      startY: y,
      currentX: x,
      currentY: y,
    })
  }, [arrows.length, isEndComplete])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!drag.isDragging) return

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Limit pull distance
    const dx = x - BOW_X
    const dy = y - BOW_Y
    const dist = Math.sqrt(dx ** 2 + dy ** 2)
    const maxPull = 100
    
    let clampedX = x
    let clampedY = y
    
    if (dist > maxPull) {
      const ratio = maxPull / dist
      clampedX = BOW_X + dx * ratio
      clampedY = BOW_Y + dy * ratio
    }

    setDrag(prev => ({
      ...prev,
      currentX: clampedX,
      currentY: clampedY,
    }))

    // Update trajectory preview
    setTrajectory(calculateTrajectory(clampedX, clampedY))
  }, [drag.isDragging, calculateTrajectory])

  const handleMouseUp = useCallback(() => {
    if (!drag.isDragging) return

    const power = Math.min(Math.sqrt((drag.currentX - BOW_X) ** 2 + (drag.currentY - BOW_Y) ** 2), 100)
    
    if (power > 10) {
      // Launch arrow
      const angle = Math.atan2(BOW_Y - drag.currentY, BOW_X - drag.currentX)
      const velocity = power * 0.28
      const vx = Math.cos(angle) * velocity
      const vy = Math.sin(angle) * velocity

      setFlyingArrow({
        x: BOW_X,
        y: BOW_Y,
        rotation: angle * (180 / Math.PI),
        visible: true,
      })

      // Animate flight
      let x = BOW_X
      let y = BOW_Y
      let vy_curr = vy
      let landed = false

      const animate = () => {
        if (landed) return

        x += vx
        y += vy_curr
        vy_curr += 0.25 // gravity

        const newRotation = Math.atan2(vy_curr, vx) * (180 / Math.PI)

        // Check if hit target or ground
        const targetLeft = TARGET_X - TARGET_WIDTH / 2
        const targetRight = TARGET_X + TARGET_WIDTH / 2
        const targetTop = TARGET_Y - TARGET_HEIGHT / 2
        const targetBottom = TARGET_Y + TARGET_HEIGHT / 2
        
        const hitTargetFace = x >= targetLeft && x <= targetRight && 
                              y >= targetTop && y <= targetBottom
        
        if (hitTargetFace) {
          // Hit target - snap to center vertical line
          landed = true
          const centerX = TARGET_X
          const score = calculateScore(centerX, y)
          
          setFlyingArrow(prev => prev ? { ...prev, visible: false } : null)
          
          const newArrow: Arrow = {
            id: arrowIdCounter,
            landed: true,
            score,
            x: centerX,
            y,
          }
          
          setArrows(prev => {
            const next = [...prev, newArrow]
            if (next.length >= 3) {
              setIsEndComplete(true)
            }
            return next
          })
          setArrowIdCounter(prev => prev + 1)
          return
        }

        // Hit ground or out of bounds
        if (y > GAME_HEIGHT - 10 || x > GAME_WIDTH || x < 0) {
          landed = true
          setFlyingArrow(prev => prev ? { ...prev, visible: false } : null)
          
          const newArrow: Arrow = {
            id: arrowIdCounter,
            landed: true,
            score: 0,
            x: Math.max(0, Math.min(GAME_WIDTH, x)),
            y: Math.min(y, GAME_HEIGHT - 10),
          }
          
          setArrows(prev => {
            const next = [...prev, newArrow]
            if (next.length >= 3) {
              setIsEndComplete(true)
            }
            return next
          })
          setArrowIdCounter(prev => prev + 1)
          return
        }

        setFlyingArrow({
          x,
          y,
          rotation: newRotation,
          visible: true,
        })

        requestAnimationFrame(animate)
      }

      requestAnimationFrame(animate)
    }

    setDrag({
      isDragging: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
    })
    setTrajectory([])
  }, [drag, calculateScore, arrowIdCounter])

  const total = arrows.reduce((sum, a) => sum + a.score, 0)
  const average = arrows.length > 0 ? (total / arrows.length).toFixed(1) : '0.0'

  // Calculate bow draw line
  const drawLine = drag.isDragging ? {
    x1: BOW_X,
    y1: BOW_Y,
    x2: drag.currentX,
    y2: drag.currentY,
  } : null

  return (
    <div className="w-full max-w-[420px] mx-auto mb-6 select-none">
      {/* Header */}
      <p className="text-center text-sm font-medium text-stone-600 mb-3">
        🎯 Try your aim!
      </p>

      {/* Game Container */}
      <div 
        ref={containerRef}
        className="relative mx-auto bg-gradient-to-b from-sky-200 to-sky-100 rounded-xl overflow-hidden border-2 border-stone-200"
        style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={(e) => {
          const touch = e.touches[0]
          const rect = containerRef.current?.getBoundingClientRect()
          if (rect) {
            const mouseEvent = {
              clientX: touch.clientX,
              clientY: touch.clientY,
            } as React.MouseEvent
            handleMouseDown(mouseEvent)
          }
        }}
        onTouchMove={(e) => {
          const touch = e.touches[0]
          const mouseEvent = {
            clientX: touch.clientX,
            clientY: touch.clientY,
          } as React.MouseEvent
          handleMouseMove(mouseEvent)
        }}
        onTouchEnd={handleMouseUp}
      >
        {/* Ground */}
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-green-300 to-green-200" />
        
        {/* Distance markers on ground */}
        <div className="absolute bottom-2 left-0 right-0 flex justify-around text-[10px] text-green-700/50 font-mono">
          <span>10m</span>
          <span>20m</span>
          <span>30m</span>
        </div>

        {/* Target Stand */}
        <div 
          className="absolute"
          style={{ 
            left: TARGET_X - 6, 
            top: TARGET_Y + TARGET_HEIGHT / 2 - 5,
          }}
        >
          {/* Vertical pole */}
          <div className="absolute left-0 top-0 w-3 h-20 bg-gradient-to-b from-stone-400 to-stone-600" />
          {/* Base legs */}
          <div className="absolute -left-5 top-18 w-14 h-2.5 bg-stone-500" style={{ transform: 'perspective(20px) rotateX(60deg)' }} />
        </div>

        {/* Target (side view - oval shape) */}
        <div 
          className="absolute"
          style={{ 
            left: TARGET_X - TARGET_WIDTH / 2, 
            top: TARGET_Y - TARGET_HEIGHT / 2,
            width: TARGET_WIDTH,
            height: TARGET_HEIGHT,
          }}
        >
          {/* Target face - side view oval with evenly distributed rings */}
          <div 
            className="absolute inset-0 rounded-[50%] border-3 border-stone-400 overflow-hidden shadow-lg"
            style={{ borderWidth: '3px' }}
          >
            {/* Ring: White (1-2 pts) - outer 20% */}
            <div className="absolute inset-0 bg-white" />
            {/* Ring: Black (3-4 pts) - 20% */}
            <div className="absolute inset-[20%] rounded-[50%] bg-stone-800" />
            {/* Ring: Blue (5-6 pts) - 20% */}
            <div className="absolute inset-[40%] rounded-[50%] bg-blue-500" />
            {/* Ring: Red (7-8 pts) - 20% */}
            <div className="absolute inset-[60%] rounded-[50%] bg-red-500" />
            {/* Ring: Yellow/Gold (9-10 pts) - 20% (bigger!) */}
            <div className="absolute inset-[80%] rounded-[50%] bg-yellow-400" />
            
            {/* X ring (inner 10) - center */}
            <div className="absolute inset-[90%] rounded-[50%] bg-yellow-300" />
            
            {/* Center dot */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-yellow-600 rounded-full" />
          </div>
          
          {/* Target frame border */}
          <div className="absolute -inset-1 rounded-[50%] border-2 border-stone-500 -z-10" />
          
          {/* Score labels on target - positioned at ring boundaries */}
          <div className="absolute inset-0 pointer-events-none">
            {/* X ring center - absolute center of target */}
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold text-yellow-800">X</span>
            {/* Yellow ring: 9-10 (80-90% inset) - show 9 near center */}
            <span className="absolute left-1/2 top-[82%] -translate-x-1/2 text-[8px] font-bold text-yellow-700">9</span>
            {/* Red ring: 7-8 (60-80% inset) - show 7 */}
            <span className="absolute left-1/2 top-[62%] -translate-x-1/2 text-[8px] font-bold text-red-700">7</span>
            {/* Blue ring: 5-6 (40-60% inset) - show 5 */}
            <span className="absolute left-1/2 top-[42%] -translate-x-1/2 text-[8px] font-bold text-blue-700">5</span>
            {/* Black ring: 3-4 (20-40% inset) - show 3 */}
            <span className="absolute left-1/2 top-[25%] -translate-x-1/2 text-[8px] font-bold text-stone-800">3</span>
            {/* White ring: 1-2 (outer 0-20% inset) - show 1 at outer edge */}
            <span className="absolute left-1/2 top-[10%] -translate-x-1/2 text-[8px] font-bold text-stone-500">1</span>
          </div>
        </div>

        {/* Bow */}
        <div 
          className="absolute"
          style={{ 
            left: BOW_X - 28, 
            top: BOW_Y - 42, 
            width: 56, 
            height: 84,
            transform: `scale(${BOW_SCALE})`,
            transformOrigin: 'center center'
          }}
        >
          {/* Bow arc - facing right */}
          <svg width="56" height="84" viewBox="0 0 40 60" className="absolute">
            <path
              d="M 5 5 Q 35 30 5 55"
              fill="none"
              stroke="#5D4037"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </svg>
          
          {/* Resting string (when not dragging) - straight line */}
          {!drag.isDragging && (
            <svg className="absolute inset-0 pointer-events-none" style={{ overflow: 'visible' }}>
              <line
                x1={7}
                y1={7}
                x2={7}
                y2={77}
                stroke="#D7CCC8"
                strokeWidth="1.5"
              />
            </svg>
          )}
          
          {/* Drawn string (when dragging) */}
          {drawLine && (
            <svg className="absolute inset-0 pointer-events-none" style={{ overflow: 'visible' }}>
              <line
                x1={7}
                y1={7}
                x2={(drawLine.x2 - (BOW_X - 28)) / BOW_SCALE}
                y2={(drawLine.y2 - (BOW_Y - 42)) / BOW_SCALE}
                stroke="#F5DEB3"
                strokeWidth="2"
              />
              <line
                x1={7}
                y1={77}
                x2={(drawLine.x2 - (BOW_X - 28)) / BOW_SCALE}
                y2={(drawLine.y2 - (BOW_Y - 42)) / BOW_SCALE}
                stroke="#F5DEB3"
                strokeWidth="2"
              />
            </svg>
          )}

          {/* Arrow nocked (when dragging) */}
          {drag.isDragging && (
            <div
              className="absolute w-10 h-1.5 bg-stone-700 origin-center"
              style={{
                left: (drawLine ? drawLine.x2 - (BOW_X - 28) : 42) / BOW_SCALE,
                top: (drawLine ? drawLine.y2 - (BOW_Y - 42) : 42) / BOW_SCALE,
                transform: `rotate(${Math.atan2(BOW_Y - drag.currentY, BOW_X - drag.currentX) * (180 / Math.PI)}deg)`,
              }}
            >
              {/* Arrowhead */}
              <div className="absolute -right-2 -top-1 w-0 h-0 border-l-[10px] border-l-stone-700 border-y-[5px] border-y-transparent" />
              {/* Fletching */}
              <div className="absolute left-0 -top-1 w-4 h-2 bg-red-400" />
            </div>
          )}
        </div>

        {/* Trajectory preview */}
        {trajectory.length > 0 && (
          <svg className="absolute inset-0 pointer-events-none">
            {trajectory.map((point, i) => (
              <circle
                key={i}
                cx={point.x}
                cy={point.y}
                r={2}
                fill="rgba(255, 255, 255, 0.7)"
              />
            ))}
          </svg>
        )}

        {/* Flying arrow */}
        {flyingArrow?.visible && (
          <div
            className="absolute w-10 h-1.5 bg-stone-700 origin-center"
            style={{
              left: flyingArrow.x,
              top: flyingArrow.y,
              transform: `rotate(${flyingArrow.rotation}deg)`,
            }}
          >
            <div className="absolute -right-2 -top-1 w-0 h-0 border-l-[10px] border-l-stone-700 border-y-[5px] border-y-transparent" />
            <div className="absolute left-0 -top-1 w-4 h-2 bg-red-400" />
          </div>
        )}

        {/* Landed arrows */}
        {arrows.map((arrow) => (
          <div
            key={arrow.id}
            className="absolute"
            style={{
              left: arrow.x,
              top: arrow.y,
              transform: 'translate(calc(-50% - 3px), -50%) rotate(-15deg)',
            }}
          >
            <div className="w-7 h-1 bg-stone-600">
              <div className="absolute -right-1.5 -top-0.5 w-0 h-0 border-l-[7px] border-l-stone-600 border-y-[3.5px] border-y-transparent" />
              <div className="absolute left-0 -top-0.5 w-2.5 h-1 bg-red-400" />
            </div>
          </div>
        ))}

        {/* Instructions */}
        {arrows.length === 0 && !drag.isDragging && !isEndComplete && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-xs text-stone-500 bg-white/80 px-3 py-1 rounded-full whitespace-nowrap">
            Drag back from bow to aim
          </div>
        )}

        {/* Reset hint */}
        {isEndComplete && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-xs text-forest font-medium bg-white/90 px-3 py-1.5 rounded-full shadow-sm">
            Click anywhere to restart
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mt-3 text-center">
        {arrows.length > 0 && (
          <div className="flex items-center justify-center gap-2 text-sm">
            {arrows.length > 0 && (
              <>
                <span className="text-stone-500">Last:</span>
                <span className={`font-bold ${arrows[arrows.length - 1].score >= 9 ? 'text-yellow-600' : arrows[arrows.length - 1].score >= 7 ? 'text-red-500' : arrows[arrows.length - 1].score >= 5 ? 'text-blue-500' : 'text-stone-700'}`}>
                  {arrows[arrows.length - 1].score === 10 ? 'X' : arrows[arrows.length - 1].score}
                </span>
                <span className="text-stone-300">·</span>
              </>
            )}
            <span className="text-stone-500">Total:</span>
            <span className="font-bold text-forest">{total}</span>
            <span className="text-stone-300">·</span>
            <span className="text-stone-500">{arrows.length}/3</span>
          </div>
        )}

        {isEndComplete && (
          <div className="mt-2 text-xs">
            <p className="text-forest font-semibold">
              End complete! Avg: {average}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
