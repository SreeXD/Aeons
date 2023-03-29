import { useRouter } from "next/router";
import { useAppState } from "../../stores/AppStore";
import { useDriveState } from "../../stores/DriveStore";
import FileInfo from "../FileInfo";
import FolderInfo from "../FolderInfo";
import style from "./style.module.css";

export default function File({ file, enableControls }) {
  const router = useRouter();
  const { id: activeFileId } = router.query;
  
  const { activateContextMenu, selected, select } = useAppState((state) => ({
    activateContextMenu: state.activateContextMenu,
    selected: state.selected[file.id],
    select: state.select,
  }));

  const { contractState, uploadFiles, relocateFiles } = useDriveState((state) => ({
    contractState: state.contractState,
    uploadFiles: state.uploadFiles,
    relocateFiles: state.relocateFiles
  }));
  
  const isFolder = file.contentType == "folder";

  const onFileDragStart = (e) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", file.id);
  };

  const onFileDrop = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    const dragFileId = e.dataTransfer.getData("text/plain");
    if (e.dataTransfer.files.length)
      await uploadFiles(e.dataTransfer.files, file.id);
    else if (contractState.isRelocatable(dragFileId, file.id)) {
      await relocateFiles([dragFileId], activeFileId, file.id);
    }
  };

  const onFileDragOver = (e) => {
    e.preventDefault();
  };

  const onFileClick = (e) => {
    e.stopPropagation();
    select(file.id);
  };

  const onFileContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selected) {
      select(file.id);
    }

    activateContextMenu(true, {
      type: "file",
      copy: !isFolder,
      file,
    });
  };

  return (
    <div
      className={`${isFolder ? style.folder : style.file} ${
        selected ? style.selected : ""
      }`}
      draggable
      onDragStart={onFileDragStart}
      onDrop={onFileDrop}
      onDragOver={onFileDragOver}
      onDoubleClick={() => router.push(`/drive/${file.id}`)}
      onClick={onFileClick}
      onContextMenu={onFileContextMenu}
    >
      {isFolder ? (
        <FolderInfo file={file} />
      ) : (
        <FileInfo
          file={file}
          className={style.filePreview}
          enableControls={enableControls}
        />
      )}
    </div>
  );
}
