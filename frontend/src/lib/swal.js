import SweetAlert from "sweetalert2";

const mockedSwal = globalThis.Swal;

const Swal = mockedSwal && typeof mockedSwal.fire === "function"
  ? mockedSwal
  : SweetAlert;

if (!globalThis.Swal || typeof globalThis.Swal.fire !== "function") {
  globalThis.Swal = SweetAlert;
}

export default Swal;
