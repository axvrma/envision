/** Keep keyboard focus inside the modal, including browsers that tab into browser chrome. */
export function prepareDialog(dialog) {
  const trap = (event) => {
    if (event.key !== "Tab" || !dialog.open) return;
    const controls = [
      ...dialog.querySelectorAll(
        "button,input,select,textarea,a[href],summary,[tabindex]",
      ),
    ].filter(
      (element) =>
        !element.disabled &&
        element.tabIndex >= 0 &&
        element.getClientRects().length,
    );
    const first = controls[0],
      last = controls.at(-1);
    if (!first) {
      event.preventDefault();
      dialog.focus();
      return;
    }
    if (
      event.shiftKey &&
      (document.activeElement === first || document.activeElement === dialog)
    ) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  dialog.addEventListener("keydown", trap);
  return () => dialog.removeEventListener("keydown", trap);
}
