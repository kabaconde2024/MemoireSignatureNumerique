package pfe.back_end.services.authentification;

public class ConvertisseurCoordonneesPdf {

    private static final float CORRECTION_X = 0;
    private static final float CORRECTION_Y = 0;


    public static float[] versEspacePdfCentree(float xFront, float yFront,
                                               float pdfWidth, float pdfHeight,
                                               float frontWidth, float frontHeight,
                                               float signatureWidth, float signatureHeight) {

        // 1. Calcul des ratios exacts
        float xRatio = xFront / frontWidth;
        float yRatio = yFront / frontHeight;

        // 2. Conversion en points PDF
        float xPdf = xRatio * pdfWidth;
        // On calcule Y depuis le BAS du PDF
        float yPdf = pdfHeight - (yRatio * pdfHeight);

        // 3. CENTRAGE (Étape cruciale)
        // On décale le point d'ancrage pour que le CLIC soit le CENTRE de l'image
        float xFinal = xPdf - (signatureWidth / 2);
        float yFinal = yPdf - (signatureHeight / 2);

        // 4. Sécurité pour ne pas sortir des bords
        xFinal = Math.max(0, Math.min(xFinal, pdfWidth - signatureWidth));
        final float yScurite = Math.max(0, Math.min(yFinal, pdfHeight - signatureHeight));

        return new float[]{xFinal, yScurite};
    }

    /**
     * MÉTHODE MANQUANTE : Utilisée par ServicePreuvePdf
     */
    public static float[] versEspacePdf(float xFront, float yFront,
                                        float pdfWidth, float pdfHeight,
                                        float frontWidth, float frontHeight) {
        float xRatio = xFront / frontWidth;
        float yRatio = yFront / frontHeight;

        float xFinal = xRatio * pdfWidth;
        float yFinal = (1 - yRatio) * pdfHeight; // On garde l'inversion de l'axe Y

        return new float[]{xFinal, yFinal};
    }
}