import styles from "./wfcargo.module.css";

export default function NotaryNotice() {
  return (
    <aside className={styles.notaryNotice} aria-label="Aviso legal • Legal notice">
      <p lang="en">I AM NOT AN ATTORNEY LICENSED TO PRACTICE LAW IN THE STATE OF FLORIDA, AND I MAY NOT GIVE LEGAL ADVICE OR ACCEPT FEES FOR LEGAL ADVICE.</p>
      <p lang="es">NO SOY ABOGADO CON LICENCIA PARA EJERCER LA ABOGACÍA EN EL ESTADO DE LA FLORIDA, Y NO PUEDO DAR ASESORÍA LEGAL NI ACEPTAR HONORARIOS POR ASESORÍA LEGAL.</p>
    </aside>
  );
}
