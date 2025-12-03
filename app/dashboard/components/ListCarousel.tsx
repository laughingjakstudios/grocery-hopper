'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ListCarouselProps {
  children: ReactNode[]
  className?: string
  totalCount?: number
}

const STORAGE_KEY = 'grocery-hopper-current-list'

export function ListCarousel({ children, className = '', totalCount }: ListCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovering, setIsHovering] = useState(false)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const totalSlides = children.length
  const minSwipeDistance = 50

  // Load saved index from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const savedIndex = parseInt(saved, 10)
      // Validate the saved index is still valid
      if (!isNaN(savedIndex) && savedIndex >= 0 && savedIndex < totalSlides) {
        setCurrentIndex(savedIndex)
      } else if (savedIndex >= totalSlides && totalSlides > 0) {
        // If saved index is out of bounds, go to last slide
        setCurrentIndex(totalSlides - 1)
      }
    }
  }, [totalSlides])

  // Save current index to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, currentIndex.toString())
  }, [currentIndex])

  // Go to specific slide
  const goToSlide = (index: number) => {
    if (index < 0) {
      setCurrentIndex(totalSlides - 1)
    } else if (index >= totalSlides) {
      setCurrentIndex(0)
    } else {
      setCurrentIndex(index)
    }
  }

  const goToPrevious = () => goToSlide(currentIndex - 1)
  const goToNext = () => goToSlide(currentIndex + 1)

  // Touch handlers
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
    setIsDragging(true)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return
    const currentTouch = e.targetTouches[0].clientX
    setTouchEnd(currentTouch)
    setDragOffset(currentTouch - touchStart)
  }

  const onTouchEnd = () => {
    setIsDragging(false)
    setDragOffset(0)

    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      goToNext()
    } else if (isRightSwipe) {
      goToPrevious()
    }

    setTouchStart(null)
    setTouchEnd(null)
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPrevious()
      } else if (e.key === 'ArrowRight') {
        goToNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex])

  if (totalSlides === 0) return null

  return (
    <div className={`relative px-0 sm:px-12 ${className}`}>
      {/* Header: Dots left, Count right */}
      <div className="flex items-center justify-between mb-4 px-1">
        {/* Dot Indicators - Left */}
        <div className="flex gap-2">
          {totalSlides > 1 && children.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'w-6 bg-green-600'
                  : 'w-2 bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to list ${index + 1}`}
            />
          ))}
        </div>

        {/* List Count - Right */}
        {totalCount !== undefined && (
          <p className="text-sm text-gray-500">
            {totalCount} {totalCount === 1 ? 'list' : 'lists'}
          </p>
        )}
      </div>

      {/* Carousel Container with arrows */}
      <div
        ref={containerRef}
        className="relative"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Slides wrapper with overflow hidden */}
        <div
          className="overflow-hidden"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div
            className={`flex ${isDragging ? '' : 'transition-transform duration-300 ease-out'}`}
            style={{
              transform: `translateX(calc(-${currentIndex * 100}% + ${dragOffset}px))`,
            }}
          >
            {children.map((child, index) => (
              <div
                key={index}
                className="w-full flex-shrink-0 px-1"
              >
                {child}
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Arrows - Outside frame when space available */}
        {totalSlides > 1 && (
          <>
            <Button
              variant="secondary"
              size="icon"
              className={`absolute top-1/2 -translate-y-1/2 z-10 rounded-full shadow-lg bg-white/90 backdrop-blur-sm transition-opacity duration-200
                left-2 sm:-left-11
                ${isHovering ? 'opacity-100' : 'opacity-0 pointer-events-none sm:opacity-100 sm:pointer-events-auto'}`}
              onClick={goToPrevious}
              aria-label="Previous list"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className={`absolute top-1/2 -translate-y-1/2 z-10 rounded-full shadow-lg bg-white/90 backdrop-blur-sm transition-opacity duration-200
                right-2 sm:-right-11
                ${isHovering ? 'opacity-100' : 'opacity-0 pointer-events-none sm:opacity-100 sm:pointer-events-auto'}`}
              onClick={goToNext}
              aria-label="Next list"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}
      </div>

    </div>
  )
}
