export function StudioBackground() {
  return (
    <div className="studio-bg" aria-hidden="true">
      <svg className="studio-bg-wave" viewBox="0 0 900 350">
        {Array.from({ length: 7 }).map((_, index) => (
          <path
            key={index}
            d={`M-40 ${90 + index * 16}C170 ${-30 + index * 17} 290 ${300 + index * 4} 510 ${
              120 + index * 10
            }S760 ${30 + index * 12} 940 ${140 + index * 8}`}
          />
        ))}
      </svg>
      <svg className="studio-bg-net" viewBox="0 0 240 180">
        <path d="M68 20h57v30h40v78h-40v30H68v-30H28V50h40V20Z" />
        <path d="M68 50v78m57-78v78M28 88h137" strokeDasharray="5 5" />
      </svg>
      <div className="studio-bg-dots" />
      <div className="studio-bg-glow" />
    </div>
  )
}
