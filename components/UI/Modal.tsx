import { Dialog, DialogPanel } from "@headlessui/react";
import React from "react";

interface ModalProps {
  open: boolean;
  setClose?: () => void;
  children: React.ReactNode;
  backdrop?: boolean;
}

export function Modal({
  open,
  setClose = () => {},
  children,
  backdrop = true,
}: ModalProps) {
  return (
    <Dialog open={open} onClose={setClose} className="relative z-50">
      {backdrop && (
        <div className="fixed inset-0 z-auto bg-black/30" aria-hidden="true" />
      )}

      <div className="fixed inset-0 z-auto flex w-screen items-center justify-center p-4">
        <DialogPanel>{children}</DialogPanel>
      </div>
    </Dialog>
  );
}
