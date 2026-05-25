import type { BusinessLayerConfig } from '../services/api'

function normalizeLayerName(name: string) {
  return String(name ?? '').trim().toLowerCase()
}

function normalizeLayerOpacity(value: unknown) {
  const opacity = Number(value ?? 1)

  if (!Number.isFinite(opacity)) {
    return 1
  }

  return Math.min(Math.max(opacity, 0), 1)
}

function getLayerPriority(layer: BusinessLayerConfig) {
  if (layer.isSystem) {
    return 2
  }

  if (layer.isArcGISServer) {
    return 1
  }

  return 0
}

export function normalizeLayerConfigs(layers: BusinessLayerConfig[]) {
  const normalizedLayers = layers.map((layer) => ({
    ...layer,
    name: String(layer.name ?? '').trim(),
    visible: Boolean(layer.visible),
    opacity: normalizeLayerOpacity(layer.opacity),
    sortOrder: Number.isFinite(Number(layer.sortOrder)) ? Number(layer.sortOrder) : 0,
    url: String(layer.url ?? ''),
  }))

  const dedupedByName = new Map<string, BusinessLayerConfig>()

  for (const layer of normalizedLayers) {
    const normalizedName = normalizeLayerName(layer.name)

    if (!normalizedName) {
      continue
    }

    const existing = dedupedByName.get(normalizedName)

    if (!existing) {
      dedupedByName.set(normalizedName, layer)
      continue
    }

    const priorityDiff = getLayerPriority(layer) - getLayerPriority(existing)

    if (priorityDiff > 0) {
      dedupedByName.set(normalizedName, layer)
      continue
    }

    if (priorityDiff < 0) {
      continue
    }

    if (layer.sortOrder < existing.sortOrder) {
      dedupedByName.set(normalizedName, layer)
      continue
    }

    if (layer.sortOrder === existing.sortOrder && layer.id < existing.id) {
      dedupedByName.set(normalizedName, layer)
    }
  }

  return Array.from(dedupedByName.values()).sort((left, right) => {
    const sortOrderDiff = left.sortOrder - right.sortOrder

    if (sortOrderDiff !== 0) {
      return sortOrderDiff
    }

    return left.id - right.id
  })
}