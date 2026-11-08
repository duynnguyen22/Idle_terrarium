/**
 * Two-tone sidebar icons from the artifact (`.tab-ic` / `.stage-ic`): brown soil line, green leaves, grey
 * rock. Colour states come from CSS in index.css keyed off the parent's aria-selected / aria-checked.
 */

export type TabIconName = 'vessel' | 'flora' | 'hardscape' | 'fauna' | 'room'

const FLORA_LEAVES =
  'M7.46 14.99Q7.80 11.73 4.74 10.56Q4.39 13.82 7.46 14.99zM7.46 14.99Q10.09 16.30 11.92 13.99Q9.28 12.69 7.46 14.99zM8.80 12.42Q9.62 9.66 7.10 8.25Q6.28 11.01 8.80 12.42zM8.80 12.42Q10.87 13.95 12.75 12.19Q10.68 10.66 8.80 12.42zM10.54 10.12Q11.68 7.92 9.70 6.41Q8.56 8.62 10.54 10.12zM10.54 10.12Q12.04 11.74 13.86 10.48Q12.36 8.86 10.54 10.12zM12.66 8.10Q13.97 6.46 12.47 5.00Q11.17 6.64 12.66 8.10zM12.66 8.10Q13.65 9.66 15.29 8.82Q14.31 7.25 12.66 8.10zM15.18 6.35Q16.48 5.25 15.39 3.96Q14.09 5.05 15.18 6.35zM15.18 6.35Q15.73 7.73 17.12 7.20Q16.57 5.81 15.18 6.35zM17.66 5.07Q18.80 4.43 17.99 3.40Q16.84 4.04 17.66 5.07zM17.66 5.07Q17.88 6.18 18.95 5.82Q18.73 4.71 17.66 5.07z'

const SOIL = <path className="soil" d="M3.5 20.5h17" />

export function TabIcon({ name }: { name: TabIconName }) {
  return (
    <svg className="tab-ic" viewBox="0 0 24 24" aria-hidden="true">
      {name === 'vessel' && (
        <>
          <path
            className="soilfill"
            d="M6.8 14.6h10.4v4.9a1.3 1.3 0 0 1-1.3 1.3H8.1a1.3 1.3 0 0 1-1.3-1.3z"
          />
          <path className="pebble" d="M8.6 18.8h.01M11 19.2h.01M13.4 18.8h.01M15.6 19.2h.01" />
          <path d="M8.5 3.5h7v2.5h-7z" />
          <path d="M7.2 6h9.6a1 1 0 0 1 1 1v12.4a1.6 1.6 0 0 1-1.6 1.6H7.8a1.6 1.6 0 0 1-1.6-1.6V7a1 1 0 0 1 1-1z" />
          <path d="M12 14.6v-3.6" />
          <path className="leaf-s" d="M12 12.4c.3-1.5 1.7-2.4 3.2-2.2c-.1 1.4-1.5 2.4-3.2 2.2z" />
          <path className="leaf-s" d="M12 13.2c-.3-1.2-1.4-1.9-2.6-1.7c.1 1.1 1.2 1.9 2.6 1.7z" />
        </>
      )}
      {name === 'flora' && (
        <>
          {SOIL}
          <path className="leaf-s" d={FLORA_LEAVES} />
          <path d="M6 20.5Q7.5 9 19 4.5" />
        </>
      )}
      {name === 'hardscape' && (
        <>
          {SOIL}
          <path
            className="rock"
            d="M4.5 20.5c-.6-3.4 1.3-6.6 4.8-7.2c3.2-.5 6 1.6 6.4 4.4l.4 2.8z"
          />
          <path
            className="wood"
            d="M14 20.5c1-2.8 2.4-5 4.6-6.6M16.6 15.7c-.5-1.5-1.5-2.6-2.9-3.3M18.6 13.9l1.6-.6"
          />
          <path className="crack" d="M8.6 16.2c1 .3 1.6 1 1.9 2" />
          <path className="moss" d="M7 13.9c1-.9 2.4-1.2 3.6-.9" />
        </>
      )}
      {name === 'fauna' && (
        <>
          {SOIL}
          <path
            className="leaf"
            d="M5.5 18c-.6-4.2 2.8-7.6 7.4-7.6c3.4 0 6 1.8 6.6 4.4c.4 1.9-.8 3.2-2.7 3.2z"
          />
          <path d="M8.5 18c-1.6.4-2.6 1.4-2.2 2.5h4.2M15.5 18.2l.3 2.3h2" />
          <circle className="eye" cx="15.6" cy="10.4" r="2.3" />
          <path className="pupil" d="M15.7 9.6v1.6" />
          <path d="M17.2 15.6c.8.2 1.5.1 2.1-.3" />
        </>
      )}
      {name === 'room' && (
        <>
          <path className="sky" d="M5.5 4.5h13v10h-13z" />
          <path d="M5.5 4.5h13v10h-13zM12 4.5v10M5.5 9.5h13" />
          <path className="soil" d="M3.5 14.5h17" />
          <path
            className="drop"
            d="M7.5 16.8c1 1.3 1.6 2.1 1.6 2.8a1.6 1.6 0 0 1-3.2 0c0-.7.6-1.5 1.6-2.8z"
          />
          <path className="wind" d="M12 18.2h5.2a1.5 1.5 0 1 0-1.4-2M12 20.6h3.4" />
        </>
      )}
    </svg>
  )
}

export function StageIcon({ stage }: { stage: 'sprout' | 'mature' }) {
  return (
    <svg className="stage-ic" viewBox="0 0 24 24" aria-hidden="true">
      {SOIL}
      {stage === 'sprout' ? (
        <>
          <path d="M12 20.5v-5.5" />
          <path className="leaf" d="M12 15c-.6-2.6-3-4-5.6-3.6c.1 2.4 2.4 4 5.6 3.6z" />
          <path className="leaf" d="M12 15c.6-2.6 3-4 5.6-3.6c-.1 2.4-2.4 4-5.6 3.6z" />
          <path className="seed" d="M9.6 20.5c.2-1.1 1.2-1.8 2.4-1.8s2.2.7 2.4 1.8" />
        </>
      ) : (
        <>
          <path d="M12 20.5V3.5" />
          <path className="leaf" d="M12 17c-.8-2.8-3.6-4.4-6.6-4c.3 2.7 3 4.5 6.6 4z" />
          <path className="leaf" d="M12 12.6c.8-2.8 3.6-4.4 6.6-4c-.3 2.7-3 4.5-6.6 4z" />
          <path className="leaf" d="M12 8.4c-.6-2.1-2.7-3.3-5-3c.2 2 2.3 3.4 5 3z" />
          <path className="leaf" d="M12 5.2c.4-1.3 1.6-2 3-1.8c-.1 1.2-1.4 2-3 1.8z" />
        </>
      )}
    </svg>
  )
}
