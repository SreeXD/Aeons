import { create } from "zustand";
import { shallow } from "zustand/shallow";
import Vector2 from "../lib/Vector2";
import { ContractFile } from '../lib/ContractState'

interface ContextMenuOpts {
  type?: string,
  copy?: boolean,
  file?: ContractFile
}

interface AppStoreData {
  cursorPosition: Vector2, 
  contextMenuActivated: boolean,
  contextMenuOpts: ContextMenuOpts,
  contextMenuPosition: Vector2,
  selected: { [id: string]: boolean },
  holdingShift: boolean,
  holdingControl: boolean,
  firstSelected: string | null,
  showWallet: boolean,
  activateContextMenu: (flag: boolean, opts: ContextMenuOpts) => void
  select: (item: string) => void,
  selectItems: (items: string[]) => void,
  clearSelection: (clearFirstSelected: boolean) => void,
  getSelection: () => string[],
  setShowWallet: (value: boolean) => void
}

export const useAppStore = create<AppStoreData>((set, get) => ({
  cursorPosition: new Vector2(),
  contextMenuActivated: false,
  contextMenuOpts: {},
  contextMenuPosition: new Vector2(),
  selected: {},
  holdingShift: false,
  holdingControl: false,
  firstSelected: null,
  showWallet: false,

  activateContextMenu: (flag: boolean, opts: ContextMenuOpts) => {
    const { cursorPosition, contextMenuPosition } = get();
    const partial: any = { contextMenuActivated: flag };

    if (flag) {
      contextMenuPosition.copy(cursorPosition);
      partial.contextMenuOpts = opts;
    } else partial.contextMenuOpts = {};

    set(partial);
  },

  select: (item: string) => {
    const { selected, firstSelected } = get()
    selected[item] = !selected[item]

    set({ selected: { ...selected }, firstSelected: firstSelected || item })
  },

  selectItems: (items: string[]) => {
    const selected = get().selected 
        
    items.forEach(item => selected[item] = true)

    set({ selected: { ...selected }})
  },

  clearSelection: (clearFirstSelected: boolean = true) => {
    set({ selected: {}, firstSelected: clearFirstSelected ? null : get().firstSelected })
  },

  getSelection: () => {
    const selected = get().selected
    return Object.keys(selected).filter(x => selected[x])
  },

  setShowWallet: (value: boolean) => {
    set({ showWallet: value })
  }
}));

export const useAppState = (selector: (state: AppStoreData) => AppStoreData) => useAppStore<AppStoreData>(selector, shallow);
