import { memo } from 'react';
import { Filter, Sliders } from 'lucide-react';
import { ENTITY_LIST, REDACTION_MODE_OPTIONS } from './entityMeta.js';

export const RedactionModeSelector = memo(function RedactionModeSelector({
  mode,
  onChangeMode,
  enabledTypes,
  onToggleCategory,
  onToggleAll,
  countsByCategory,
}) {
  const allEnabled = enabledTypes.length === ENTITY_LIST.length;

  return (
    <div style={{ display: 'grid', gap: '1.1rem' }}>
      <div>
        <div className="panel-title-row" style={{ marginBottom: '0.65rem' }}>
          <h3 className="panel-title">
            <Sliders size={16} aria-hidden="true" />
            <span>Redaction Mode</span>
          </h3>
        </div>

        <div className="mode-list" role="group" aria-label="Redaction mode options">
          {REDACTION_MODE_OPTIONS.map((opt) => {
            const isSelected = mode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                className={`mode-option ${isSelected ? 'selected' : ''}`}
                aria-pressed={isSelected}
                onClick={() => onChangeMode(opt.id)}
              >
                <div>
                  <strong>{opt.title}</strong>
                  <span>{opt.description}</span>
                </div>
                <code className="mode-example">{opt.example}</code>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="panel-title-row" style={{ marginBottom: '0.6rem' }}>
          <h3 className="panel-title">
            <Filter size={15} aria-hidden="true" />
            <span>Entity Categories</span>
          </h3>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onToggleAll(!allEnabled)}
          >
            {allEnabled ? 'Disable All' : 'Enable All'}
          </button>
        </div>

        <div className="category-toggles" role="group" aria-label="Entity category filters">
          {ENTITY_LIST.map((cat) => {
            const active = enabledTypes.includes(cat.type);
            const count = countsByCategory?.[cat.type] ?? 0;
            return (
              <button
                key={cat.type}
                type="button"
                className={`cat-toggle ${active ? 'active' : ''}`}
                aria-pressed={active}
                onClick={() => onToggleCategory(cat.type)}
                title={cat.description}
              >
                <span
                  className="cat-dot"
                  style={{ backgroundColor: cat.colorVar, opacity: active ? 1 : 0.35 }}
                  aria-hidden="true"
                />
                <span>{cat.singular}</span>
                <span className="mono" style={{ opacity: 0.78 }}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});
