import React from "react"
import Svg, { G, Path } from "react-native-svg"

type Props = {
  size?: number
  color?: string
  strokeWidth?: number
}

export function FoxydroidDoubleNoseRN({
  size = 24,
  color = "#000",
  strokeWidth = 1,
}: Props) {
  const common = {
    fill: "none" as const,
    stroke: color,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  }

  return (
    <Svg width={size} height={size * 2} viewBox="0 0 48 85">
      {/* Original - bottom vertex at y=42.5 */}
      <G>
        <Path
          {...common}
          d="m24 16.17l-9.24 5.33l-9.24 5.34V5.5l9.24 5.33zm0 0l9.24-5.34l9.24-5.33v21.34l-9.24-5.34z"
        />
        <Path
          {...common}
          d="M42.48 26.84L24 42.5V16.17l9.24 5.33zm-36.96 0l9.24-5.34L24 16.17V42.5z"
        />
      </G>

      {/* Mirrored copy - rotate 180° and position so top vertex meets at y=42.5 */}
      <G transform="translate(48 85) rotate(180)">
        <Path
          {...common}
          d="m24 16.17l-9.24 5.33l-9.24 5.34V5.5l9.24 5.33zm0 0l9.24-5.34l9.24-5.33v21.34l-9.24-5.34z"
        />
        <Path
          {...common}
          d="M42.48 26.84L24 42.5V16.17l9.24 5.33zm-36.96 0l9.24-5.34L24 16.17V42.5z"
        />
      </G>
    </Svg>
  )
}
