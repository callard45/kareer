import React, { useState } from "react";
import { FileTextIcon, DownloadIcon, EyeIcon, TrashIcon } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { useCvHistory } from "../../../hooks/useCvHistory";
import { GeneratedCvHistoryItem } from "../../../types/generatedCvHistory";

interface GeneratedCvListProps {
  onPreview?: (cv: GeneratedCvHistoryItem) => void;
  onDownload?: (cv: GeneratedCvHistoryItem) => void;
}

export const GeneratedCvList: React.FC<GeneratedCvListProps> = ({
  onPreview,
  onDownload
}) => {
  const { items, removeItem, clear } = useCvHistory();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = (cvId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce CV ?")) {
      return;
    }

    try {
      setDeletingId(cvId);
      removeItem(cvId);
    } catch (err) {
      console.error("Error deleting CV:", err);
      alert("Erreur lors de la suppression du CV");
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = () => {
    if (!confirm("Êtes-vous sûr de vouloir effacer tout l'historique ?")) {
      return;
    }
    clear();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  };

  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileTextIcon className="h-5 w-5 text-blue-600" />
              CV déjà générés
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Retrouvez ici les CV que vous avez déjà générés avec Kareer.
            </p>
          </div>
          {items.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className="text-slate-600 hover:text-red-600"
            >
              Effacer l'historique
            </Button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="bg-slate-50 rounded-lg p-8 text-center">
            <FileTextIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 text-sm">
              Vous n'avez pas encore généré de CV. Générez-en un pour le retrouver ici.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {items.map((cv) => (
              <div
                key={cv.id}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-800 truncate">
                    {cv.title}
                  </h4>
                  <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-500">
                    <span>Généré le {formatDate(cv.createdAt)}</span>
                    {cv.role && (
                      <>
                        <span>•</span>
                        <span>{cv.role}</span>
                      </>
                    )}
                    {cv.company && (
                      <>
                        <span>•</span>
                        <span>{cv.company}</span>
                      </>
                    )}
                    {cv.template && (
                      <>
                        <span>•</span>
                        <span className="capitalize">Template: {cv.template}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {onPreview && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onPreview(cv)}
                      className="h-8 px-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      title="Prévisualiser"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                  )}

                  {onDownload && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDownload(cv)}
                      className="h-8 px-3 text-green-600 hover:text-green-700 hover:bg-green-50"
                      title="Télécharger"
                    >
                      <DownloadIcon className="h-4 w-4" />
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(cv.id)}
                    disabled={deletingId === cv.id}
                    className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Supprimer"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
