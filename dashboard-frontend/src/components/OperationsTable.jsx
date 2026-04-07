function OperationsTable({ title, eyebrow, items, columns, emptyMessage }) {
  const hasItems = items.length > 0;

  return (
    <section className="table-container">
      <div className="table-header">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h3>{title}</h3>
        </div>

        <div className="table-summary">
          <strong>{items.length}</strong>
          <span>records visible</span>
        </div>
      </div>

      {!hasItems ? (
        <div className="table-state empty-state">{emptyMessage}</div>
      ) : (
        <div className="table-scroll">
          <table className="devices-table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  {columns.map((column) => (
                    <td key={column.key}>
                      {column.render ? column.render(item[column.key], item) : item[column.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default OperationsTable;
