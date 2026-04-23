import SweetAlert from "sweetalert2";

const runtimeGlobal = globalThis as typeof globalThis & {
  Swal?: typeof SweetAlert;
};

const mockedSwal = runtimeGlobal.Swal;

const Swal = mockedSwal && typeof mockedSwal.fire === "function"
  ? mockedSwal
  : SweetAlert;

if (!runtimeGlobal.Swal || typeof runtimeGlobal.Swal.fire !== "function") {
  runtimeGlobal.Swal = SweetAlert;
}

export default Swal;
