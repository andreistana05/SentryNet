import type { ReactNode } from "react";
import type { OperationRecord } from "../types/domain";

export interface OperationsTableColumn<T extends OperationRecord> {
  key: string;
  label: string;
  render?: (value: unknown, item: T) => ReactNode;
}

interface OperationsTableProps<T extends OperationRecord> {
  title: string;
  eyebrow: string;
  items: T[];
  columns: OperationsTableColumn<T>[];
  emptyMessage: string;
}

function OperationsTable<T extends OperationRecord>({
  title,
  eyebrow,
  items,
  columns,
  emptyMessage,
}: OperationsTableProps<T>) {
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
                <tr key={String(item.id)}>
                  {columns.map((column) => (
                    <td key={column.key}>
                      {column.render
                        ? column.render(item[column.key], item)
                        : typeof item[column.key] === "string" || typeof item[column.key] === "number"
                          ? String(item[column.key])
                          : "--"}
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
