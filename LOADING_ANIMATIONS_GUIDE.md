# Loading Animations

Reusable loading animations to use across all pages. All components are centered and have white backgrounds.

## Components

### 1. LoadingSpinner (Default)
Classic spinning loader with SVG circle.

```jsx
import { LoadingSpinner } from './components/LoadingSpinner'

// Full screen overlay (default)
<LoadingSpinner />

// Full screen with message
<LoadingSpinner message="Loading your data..." />

// Inline (not full screen)
<LoadingSpinner fullScreen={false} />

// Different sizes
<LoadingSpinner size="sm" />  // Small
<LoadingSpinner size="md" />  // Medium (default)
<LoadingSpinner size="lg" />  // Large
```

### 2. LoadingSpinnerDots
Bouncing dots animation.

```jsx
import { LoadingSpinnerDots } from './components/LoadingVariations'

<LoadingSpinnerDots message="Please wait..." />
```

### 3. LoadingPulse
Pulsing square animation.

```jsx
import { LoadingPulse } from './components/LoadingVariations'

<LoadingPulse />
```

### 4. LoadingRing
Ring/donut spinner.

```jsx
import { LoadingRing } from './components/LoadingVariations'

<LoadingRing message="Analyzing..." />
```

### 5. LoadingBars
Animated bars (equalizer style).

```jsx
import { LoadingBars } from './components/LoadingVariations'

<LoadingBars message="Processing..." />
```

## Props

All loading components accept:

- **fullScreen** (boolean, default: `true`)
  - `true`: Fixed full-screen overlay with white background
  - `false`: Inline centered component within parent

- **message** (string, optional)
  - Text to display below the animation
  - Example: "Loading your profile..."

- **size** (string, only for LoadingSpinner)
  - `'sm'` - Small (32px)
  - `'md'` - Medium, default (48px)
  - `'lg'` - Large (64px)

## Usage Examples

### In Pages

```jsx
import { useState, useEffect } from 'react'
import { LoadingSpinner } from '../components/LoadingSpinner'

export function MyPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const result = await api.getData()
      setData(result)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingSpinner message="Loading your data..." />

  return (
    <div>
      {/* Your page content */}
    </div>
  )
}
```

### Inline Loading

```jsx
import { LoadingSpinner } from '../components/LoadingSpinner'

export function DataList() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  if (loading) {
    return <LoadingSpinner fullScreen={false} message="Loading items..." />
  }

  return (
    <div>
      {items.map(item => <div key={item.id}>{item.name}</div>)}
    </div>
  )
}
```

### Different Animation Styles

```jsx
import { 
  LoadingSpinner, 
  LoadingSpinnerDots, 
  LoadingRing, 
  LoadingBars 
} from '../components'

// Use different styles based on context
<LoadingRing message="Analyzing job fit..." />        // For AI analysis
<LoadingBars message="Processing..." />               // For uploads
<LoadingSpinnerDots message="Fetching jobs..." />    // For data loading
```

## Styling

All loaders use:
- `bg-white` background
- `z-50` z-index (appears on top)
- `text-primary` color (matches your theme)
- Centered positioning with flexbox

To customize colors, edit the color classes in the component files.

## Tips

- Use full-screen for page-level loading states
- Use inline loading for component-level operations
- Always include a message for better UX
- Choose animation style based on action type
- Keep messages short and descriptive
