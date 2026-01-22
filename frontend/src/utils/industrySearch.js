export const rankIndustriesByQuery = (industries, query) => {
  const q = (query || '').trim().toLowerCase()
  const scored = industries.map((ind) => {
    const name = (ind.name || '').toLowerCase()
    const category = (ind.category || '').toLowerCase()
    let score = 0
    if (!q) score = 0
    else {
      if (name === q) score += 120
      if (name.startsWith(q)) score += 100
      else if (name.includes(q)) score += 60
      if (category === q) score += 50
      if (category.startsWith(q)) score += 40
      else if (category.includes(q)) score += 20
    }
    return { ...ind, _score: score }
  })

  const grouped = scored.reduce((acc, ind) => {
    const cat = ind.category || 'Other'
    if (!acc[cat]) acc[cat] = { category: cat, items: [], _catScore: 0 }
    acc[cat].items.push(ind)
    if (ind._score > acc[cat]._catScore) acc[cat]._catScore = ind._score
    // Slight boost if category text matches
    const q = (query || '').trim().toLowerCase()
    if (q && cat.toLowerCase().includes(q)) acc[cat]._catScore = Math.max(acc[cat]._catScore, 30)
    return acc
  }, {})

  const categories = Object.values(grouped)
    .map((g) => ({
      category: g.category,
      _catScore: g._catScore,
      items: g.items
        .slice()
        .sort((a, b) => (b._score - a._score) || a.name.localeCompare(b.name))
        .map(({ _score, ...rest }) => rest),
    }))
    .sort((a, b) => (b._catScore - a._catScore) || a.category.localeCompare(b.category))

  return categories
}
