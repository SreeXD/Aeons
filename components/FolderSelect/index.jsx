import { useRouter } from "next/router";
import { useState } from "react";
import { useDriveState } from "../../stores/DriveStore";
import { useAppState } from "../../stores/AppStore";
import Button from "../Button";
import style from "./style.module.css";

export default function FolderSelect() {
  const { id: activeFileId } = useRouter().query;

  const { contractState, relocateFiles } = useDriveState((state) => ({
    contractState: state.contractState, 
    relocateFiles: state.relocateFiles
  }));
  
  const { activateContextMenu, getSelection } = useAppState((state) => ({
    activateContextMenu: state.activateContextMenu,
    getSelection: state.getSelection
  }));
  
  const [currentFileId, setCurrentFileId] = useState("root");
  const [selectedFileId, setSelectedFileId] = useState("root");
  const currentFile = contractState.getFile(currentFileId);
  const selection = getSelection();
  const isMovable = selection.filter(
    (file) => !contractState.isRelocatable(file, selectedFileId)
  ).length;

  async function onMoveButtonClick() {
    activateContextMenu(false);
    await relocateFiles(selection, activeFileId, selectedFileId);
  }

  return (
    <div>
      {contractState
        .getChildren(currentFileId)
        .filter((file) => file.contentType == "folder")
        .map((file) => (
          <div
            key={file.id}
            className={`${style.folder} ${
              file.id == selectedFileId ? style.selected : ""
            }`}
            onClick={() => setSelectedFileId(file.id)}
            onDoubleClick={() => {
              contractState.getChildren(file.id).filter((file) => file.contentType == "folder")
                .length && setCurrentFileId(file.id);
            }}
          >
            {file.name}
          </div>
        ))}

      <Button
        disabled={currentFile.parentId == null}
        onClick={() => setCurrentFileId(currentFile.parentId ?? "root")}
      >
        back
      </Button>
      <Button disabled={isMovable} onClick={onMoveButtonClick}>
        move
      </Button>
    </div>
  );
}
