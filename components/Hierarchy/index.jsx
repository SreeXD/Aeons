import { useEffect, useState } from "react";
import { useAppContext } from "../../contexts/AppContext";
import { useBundlrContext } from "../../contexts/BundlrContext";
import { useRouter } from "next/router";
import style from "./style.module.css";

function HierarchyItem({ item, depth }) {
  const router = useRouter()

  const [collapsed, setCollapsed] = useState(true);
  const {
    activateContextMenu,
    currentFile,
    currentFileAncestors,
  } = useAppContext();
  
  const expandable = item.type == "folder" || item.type == "drive" || item.name == "root";

  useEffect(() => {
    if (currentFileAncestors.includes(item.id)) {
      setCollapsed(false);
    }
  }, [currentFileAncestors]);

  return (
    <div>
      <div
        className={style.item}
        style={
          item.id == currentFile
            ? {
                color: "var(--color-active-high)",
              }
            : {}
        }
        onClick={() => router.push(`/drive/${item.id}`)}
        onContextMenu={(e) => {
          e.preventDefault();
          activateContextMenu(true, {
            type: "hierarchy",
            data: item,
          });
        }}
      >
        <div
          className={style.itemHead}
          style={{
            transform: `translateX(${0.9 * depth + (!expandable ? 0.5 : 0)}rem)`,
          }}
        >
          {expandable && (
            <div className={style.arrowHead}>
              <svg
                style={{
                  transform: collapsed ? "rotate(0deg)" : "rotate(90deg)",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setCollapsed((collapsed) => !collapsed);
                }}
                viewBox="0 0 48 48"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g id="Layer_2" data-name="Layer 2">
                  <g id="invisible_box" data-name="invisible box">
                    <rect width="48" height="48" fill="none" />
                  </g>
                  <g id="icons_Q2" data-name="icons Q2">
                    <path d="M27.2,24,16.6,34.6a1.9,1.9,0,0,0,.2,3,2.1,2.1,0,0,0,2.7-.2l11.9-12a1.9,1.9,0,0,0,0-2.8l-11.9-12a2.1,2.1,0,0,0-2.7-.2,1.9,1.9,0,0,0-.2,3Z" />
                  </g>
                </g>
              </svg>
            </div>
          )}

          <span className={style.itemName}>{item.name}</span>
        </div>
      </div>

      {expandable && (
        <div
          className={style.children}
          style={{
            height: collapsed ? 0 : "auto",
          }}
        >
          {item.children
            .filter((child) => child.type == "folder" || child.type == "drive")
            .map((child) => (
              <HierarchyItem key={child.id} item={child} depth={depth + 1} />
            ))}

          {item.children
            .filter((child) => child.type == "file")
            .map((child) => (
              <HierarchyItem key={child.id} item={child} depth={depth + 1} />
            ))}
        </div>
      )}
    </div>
  );
}

export default function Hierarchy() {
  const { fileSystem } = useBundlrContext();
  let root = fileSystem.hierarchy.getFile('root')

  return (
    <div className={style.hierarchy}>
      <HierarchyItem item={root} depth={0} />
    </div>
  );
}