export interface TextractResult {
  BlockType: string;
  Id: string;
  Text: string;
  Confidence: number;
  Geometry: {
    BoundingBox: {
      Height: number;
      Left: number;
      Top: number;
      Width: number;
    };
    Polygon: Array<{
      X: number;
      Y: number;
    }>;
  };
}

interface ResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: TextractResult[];
}

import { useState } from "react";

export const ResultModal = ({ isOpen, onClose, results }: ResultModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedResults, setEditedResults] = useState<
    Array<{
      value: string;
      confidence: string;
    }>
  >([]);

  if (!isOpen) return null;

  const formatResults = (results: TextractResult[]) => {
    return [
      {
        // What is the Gross Pay for this period?'
        value: results[0]?.Text || "",
        confidence: `${(results[0]?.Confidence || 0).toFixed(1)}%`,
      },
      {
        // What is the Net Pay?
        value: results[1]?.Text || "",
        confidence: `${(results[1]?.Confidence || 0).toFixed(1)}%`,
      },
    ];
  };

  const formattedResults = formatResults(results);

  const handleEditClick = () => {
    setEditedResults(formattedResults);
    setIsEditing(true);
  };

  const handleValueChange = (index: number, value: string) => {
    setEditedResults((prev) =>
      prev.map((item, i) => (i === index ? { ...item, value } : item))
    );
  };

  const handleRegister = () => {
    if (isEditing) {
      console.log("編集した値を登録:", editedResults);
    } else {
      console.log("元の値を登録:", formattedResults);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-10">
      <div className="fixed inset-0 bg-black bg-opacity-30" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
          <div className="rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase">
                    金額
                  </th>
                  <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase">
                    信頼性
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(isEditing ? editedResults : formattedResults).map(
                  (result, index) => (
                    <tr
                      key={index}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {isEditing ? (
                          <input
                            type="text"
                            value={result.value}
                            onChange={(e) =>
                              handleValueChange(index, e.target.value)
                            }
                            className="w-full border rounded px-2 py-1"
                          />
                        ) : (
                          result.value
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {result.confidence}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleRegister}
                  className="rounded-md bg-green-600 px-4 py-2 text-sm text-white"
                >
                  登録する
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-md bg-gray-600 px-4 py-2 text-sm text-white"
                >
                  キャンセル
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleEditClick}
                  className="rounded-md bg-yellow-600 px-4 py-2 text-sm text-white"
                >
                  編集する
                </button>
                <button
                  type="button"
                  onClick={handleRegister}
                  className="rounded-md bg-green-600 px-4 py-2 text-sm text-white"
                >
                  登録する
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white"
                >
                  閉じる
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
