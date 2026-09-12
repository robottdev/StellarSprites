using UnityEngine;
using System.Collections.Generic;
using GDI = System.Drawing;

using LibNoise;
using LibNoise.Generator;
using LibNoise.Operator;

namespace Stellar_Sprites
{
    public class SS_Station
    {
        public int Width { get { return 256; } }
        public int Height { get { return 256; } }

        public int Seed { get; set; }

        private SS_SpriteTexture finalTexture;

        private Color[] GradientColors;
        private SS_SpriteTexture BaseTexture;
        private float ColorDetail;

        private GDI.Brush fillBrush = new GDI.SolidBrush(GDI.Color.Magenta);
        private GDI.Pen outlinePen = new GDI.Pen(GDI.Color.Black, 1);

		private SS_Random random;

        public SS_Station(int seed, Color[] colors, float colorDetail, int numberOfPods)
        {
            GradientColors = colors;
            BaseTexture = GenerateBaseTexture(seed);
            ColorDetail = colorDetail;

			random = new SS_Random (seed);

            finalTexture = new SS_SpriteTexture(Width, Height);

            int podCount = numberOfPods;
            int podSize = 64;
            int step = 360 / podCount;

            GDI.Pen inlinePen = new GDI.Pen(GDI.Color.DarkCyan, 3);
            GDI.Pen thickOutlinePen = new GDI.Pen(GDI.Color.Black, 5);

            GDI.Point center = new GDI.Point(Width / 2, Height / 2);

            List<GDI.Point> podPositions = new List<GDI.Point>();
            for (int a = 0; a < 359; a += step)
            {
                int x = center.X + (int)(Mathf.Cos((float)a * Mathf.Deg2Rad) * 96);
                int y = center.Y + (int)(Mathf.Sin((float)a * Mathf.Deg2Rad) * 96);

                podPositions.Add(new GDI.Point(x, y));
            }

            GDI.Bitmap bmp = new GDI.Bitmap(Width, Height);
            using (GDI.Graphics g = GDI.Graphics.FromImage(bmp))
            {
                g.Clear(GDI.Color.Transparent);

				int bridgeWidth = random.RangeEven(8, 16);

                List<GDI.Point> points = new List<GDI.Point>();
                for (int i = 0; i < podPositions.Count; i++)
                {
                    int px1 = podPositions[i].X + (int)(Mathf.Cos((i * step - 90) * Mathf.Deg2Rad) * bridgeWidth);
                    int py1 = podPositions[i].Y + (int)(Mathf.Sin((i * step - 90) * Mathf.Deg2Rad) * bridgeWidth);
                    int px2 = podPositions[i].X + (int)(Mathf.Cos((i * step + 90) * Mathf.Deg2Rad) * bridgeWidth);
                    int py2 = podPositions[i].Y + (int)(Mathf.Sin((i * step + 90) * Mathf.Deg2Rad) * bridgeWidth);

                    int cx1 = center.X + (int)(Mathf.Cos((i * step - 90) * Mathf.Deg2Rad) * bridgeWidth);
                    int cy1 = center.Y + (int)(Mathf.Sin((i * step - 90) * Mathf.Deg2Rad) * bridgeWidth);
                    int cx2 = center.X + (int)(Mathf.Cos((i * step + 90) * Mathf.Deg2Rad) * bridgeWidth);
                    int cy2 = center.Y + (int)(Mathf.Sin((i * step + 90) * Mathf.Deg2Rad) * bridgeWidth);

                    points.Add(new GDI.Point(cx1, cy1));
                    points.Add(new GDI.Point(px1, py1));
                    points.Add(new GDI.Point(px2, py2));
                    points.Add(new GDI.Point(cx2, cy2));

                    g.FillPolygon(fillBrush, points.ToArray());
                }

				int numPoints = random.RangeEven(6, 10);
                for (int i = 0; i < podPositions.Count; i++)
                {
                    float angleStep = 360.0f / numPoints;

                    List<GDI.Point> controlPoints = new List<GDI.Point>();
                    for (float angle = 0; angle < 360f; angle += angleStep)
                    {
                        int px = (int)(podPositions[i].X + (Mathf.Cos(angle * Mathf.Deg2Rad) * (podSize * 0.5)));
                        int py = (int)(podPositions[i].Y + (Mathf.Sin(angle * Mathf.Deg2Rad) * (podSize * 0.5)));

                        controlPoints.Add(new GDI.Point(px, py));
                    }
                    g.FillPolygon(fillBrush, controlPoints.ToArray());
                    g.DrawPolygon(outlinePen, controlPoints.ToArray());

                    List<GDI.Point> controlPoints2 = new List<GDI.Point>();
                    for (float angle = 0; angle < 360f; angle += angleStep)
                    {
                        int px = (int)(podPositions[i].X + (Mathf.Cos(angle * Mathf.Deg2Rad) * (podSize * 0.4)));
                        int py = (int)(podPositions[i].Y + (Mathf.Sin(angle * Mathf.Deg2Rad) * (podSize * 0.4)));

                        controlPoints2.Add(new GDI.Point(px, py));
                    }

                    g.DrawPolygon(thickOutlinePen, controlPoints2.ToArray());
                    g.DrawPolygon(inlinePen, controlPoints2.ToArray());
                }

				int hubSize = random.RangeEven (64, 128);
				int numHubPoints = random.RangeEven(6, 10);

                float hubAngleSteps = 360.0f / numHubPoints;

                List<GDI.Point> hubPoints = new List<GDI.Point>();
                for (float angle = 0; angle < 360f; angle += hubAngleSteps)
                {
                    int px = (int)(center.X + (Mathf.Cos(angle * Mathf.Deg2Rad) * (hubSize * 0.5)));
                    int py = (int)(center.Y + (Mathf.Sin(angle * Mathf.Deg2Rad) * (hubSize * 0.5)));

                    hubPoints.Add(new GDI.Point(px, py));
                }
                g.FillPolygon(fillBrush, hubPoints.ToArray());
                g.DrawPolygon(outlinePen, hubPoints.ToArray());

                List<GDI.Point> hubPoints2 = new List<GDI.Point>();
                for (float angle = 0; angle < 360f; angle += hubAngleSteps)
                {
                    int px = (int)(center.X + (Mathf.Cos(angle * Mathf.Deg2Rad) * (hubSize * 0.4)));
                    int py = (int)(center.Y + (Mathf.Sin(angle * Mathf.Deg2Rad) * (hubSize * 0.4)));

                    hubPoints2.Add(new GDI.Point(px, py));
                }

                g.DrawPolygon(thickOutlinePen, hubPoints2.ToArray());
                g.DrawPolygon(inlinePen, hubPoints2.ToArray());
            }

			SS_SpriteTexture b1 = BitmapToSpriteTexture (bmp);
			SS_Utilities.Outline(b1, Color.black);
			Texturize(seed, b1, Color.magenta, Color.white, true);
			ShadeEdge(b1);
			SS_Utilities.MergeColors(finalTexture, b1, 0, 0);
        }

        private SS_SpriteTexture BitmapToSpriteTexture(GDI.Bitmap bitmap)
        {
            SS_SpriteTexture st = new SS_SpriteTexture(bitmap.Width, bitmap.Height);
            for (int y = 0; y < bitmap.Height; y++)
            {
                for (int x = 0; x < bitmap.Width; x++)
                {
                    GDI.Color c = bitmap.GetPixel(x, y);
                    float r = c.R / 255f;
                    float g = c.G / 255f;
                    float b = c.B / 255f;
                    float a = c.A / 255f;
                    st.SetPixel(x, y, new Color(r, g, b, a));
                }
            }
            return st;
        }

        private void ShadeEdge(SS_SpriteTexture spriteTexture)
        {
            Color[] tmpColors = new Color[spriteTexture.Width * spriteTexture.Height];
            for (int y = 0; y < spriteTexture.Height; y++)
            {
                for (int x = 0; x < spriteTexture.Width; x++)
                {
                    tmpColors[x + y * spriteTexture.Width] = spriteTexture.GetPixel(x, y);
                }
            }

            for (int y = 1; y < spriteTexture.Height - 1; y++)
            {
                for (int x = 1; x < spriteTexture.Width - 1; x++)
                {
                    Color c = spriteTexture.GetPixel(x, y);

                    if (c != Color.clear && c != Color.black)
                    {
                        Color tL = spriteTexture.GetPixel(x - 1, y - 1);
                        Color tM = spriteTexture.GetPixel(x, y - 1);
                        Color tR = spriteTexture.GetPixel(x + 1, y - 1);

                        Color mL = spriteTexture.GetPixel(x - 1, y);
                        Color mR = spriteTexture.GetPixel(x + 1, y);

                        Color bL = spriteTexture.GetPixel(x - 1, y + 1);
                        Color bM = spriteTexture.GetPixel(x, y + 1);
                        Color bR = spriteTexture.GetPixel(x + 1, y + 1);

                        if ((tL == Color.black || tM == Color.black || tR == Color.black ||
                             mL == Color.black || mR == Color.black ||
                             bL == Color.black || bM == Color.black || bR == Color.black))
                        {
                            c.r *= 0.5f;
                            c.g *= 0.5f;
                            c.b *= 0.5f;

                            tmpColors[x + y * spriteTexture.Width] = c;
                        }
                    }
                }
            }

            for (int x = 0; x < spriteTexture.Width; x++)
            {
                if (spriteTexture.GetPixel(x, 0) != Color.clear)
                {
                    spriteTexture.SetPixel(x, 0, Color.black);

                }
                if (spriteTexture.GetPixel(x, spriteTexture.Height - 1) != Color.clear)
                {
                    spriteTexture.SetPixel(x, spriteTexture.Height - 1, Color.black);
                }
            }

            spriteTexture.ColorData = tmpColors;
        }

        private void Texturize(int seed, SS_SpriteTexture spriteTexture, Color targetColor, Color tint, bool highlights)
        {
            Perlin perlin = new Perlin(0.025, 2, 0.5, 8, seed + 1, QualityMode.Low);
            Voronoi hightlightVoronoi = new Voronoi((double)ColorDetail, 2, seed + 1, false);

            float eastShading = 1.5f;
            float westShading = 1.5f;
            float northShading = 1.5f;
            float southShading = 1.5f;
            int shadingThickness = 4;

            for (int y = 0; y < spriteTexture.Height / 2; y++)
            {
                for (int x = 0; x < spriteTexture.Width / 2; x++)
                {
                    if (spriteTexture.GetPixel(x, y) == targetColor)
                    {
                        Color hullShade = BaseTexture.GetPixel(x, y);

                        // Pixel shade
                        float pixelNoise = (float)perlin.GetValue(x, y, 0);
                        pixelNoise = (pixelNoise + 3.0f) * 0.25f; // 0.5 to 1.0
                        pixelNoise = Mathf.Clamp(pixelNoise, 0.5f, 1f);

                        hullShade *= tint * pixelNoise;

                        if (highlights)
                        {
                            // Pixel shade
                            float hightlightNoise = (float)hightlightVoronoi.GetValue(x, y, 0);
                            hightlightNoise = (hightlightNoise + 1.0f) * 0.5f; // 0.0 to 1.0
                            hightlightNoise = Mathf.Clamp(hightlightNoise, 0.0f, 1f);

                            if (hightlightNoise <= 0.75f)
                            {
                                hullShade = GradientColors[0] * pixelNoise;
                            }
                            else
                            {
                                hullShade = GradientColors[1] * pixelNoise;
							}
						}

                        bool shading = true;
                        if (shading)
                        {
                            bool hasEastBorder = false;
                            int cntr = 0;
                            while (!hasEastBorder)
                            {
                                int currentX = x + cntr;
                                if (currentX < 0) currentX = 0;
                                if (currentX > Width - 1) currentX = Width - 1;
                                Color shadingPixel = spriteTexture.GetPixel(currentX, y);
                                if (shadingPixel == Color.black)
                                {
                                    hasEastBorder = true;
                                }

                                cntr++;
                                if (cntr > shadingThickness)
                                {
                                    break;
                                }
                            }
                            if (hasEastBorder)
                            {
                                hullShade *= eastShading;
                            }

                            bool hasWestBorder = false;
                            cntr = 0;
                            while (!hasWestBorder)
                            {
                                int currentX = x - cntr;
                                if (currentX < 0) currentX = 0;
                                if (currentX > Width - 1) currentX = Width - 1;
                                Color shadingPixel = spriteTexture.GetPixel(currentX, y);
                                if (shadingPixel == Color.black)
                                {
                                    hasWestBorder = true;
                                }

                                cntr++;
                                if (cntr > shadingThickness)
                                {
                                    break;
                                }
                            }
                            if (hasWestBorder)
                            {
                                hullShade *= westShading;
                            }

                            bool hasNorthBorder = false;
                            cntr = 0;
                            while (!hasNorthBorder)
                            {
                                int currentY = y - cntr;
                                if (currentY < 0) currentY = 0;
                                if (currentY > Height - 1) currentY = Height - 1;
                                Color shadingPixel = spriteTexture.GetPixel(x, currentY);
                                if (shadingPixel == Color.black)
                                {
                                    hasNorthBorder = true;
                                }

                                cntr++;
                                if (cntr > shadingThickness)
                                {
                                    break;
                                }
                            }
                            if (hasNorthBorder)
                            {
                                hullShade *= northShading;
                            }

                            bool hasSouthBorder = false;
                            cntr = 0;
                            while (!hasSouthBorder)
                            {
                                int currentY = y + cntr;
                                if (currentY < 0) currentY = 0;
                                if (currentY > Height - 1) currentY = Height - 1;
                                Color shadingPixel = spriteTexture.GetPixel(x, currentY);
                                if (shadingPixel == Color.black)
                                {
                                    hasSouthBorder = true;
                                }

                                cntr++;
                                if (cntr > shadingThickness)
                                {
                                    break;
                                }
                            }
                            if (hasSouthBorder)
                            {
                                hullShade *= southShading;
                            }
                        }

                        hullShade.a = 1.0f;
                        spriteTexture.SetPixel(x, y, hullShade);
                    }
                }
            }

            // Mirror
			for (int y = spriteTexture.Height / 2; y < spriteTexture.Height; y++)
            {
                for (int x = 0; x < spriteTexture.Width; x++)
                {
                    Color pixel = spriteTexture.GetPixel(x, y);
                    if (pixel == targetColor)
                    {
                        spriteTexture.SetPixel(x, y, spriteTexture.GetPixel(x, spriteTexture.Height - 1 - y));
                    }
                }
            }

            for (int y = 0; y < spriteTexture.Height; y++)
            {
                for (int x = spriteTexture.Width / 2; x < spriteTexture.Width; x++)
                {
                    Color pixel = spriteTexture.GetPixel(x, y);
                    if (pixel == targetColor)
                    {
                        spriteTexture.SetPixel(x, y, spriteTexture.GetPixel(spriteTexture.Width - 1 - x, y));
                    }
                }
            }
        }

        private SS_SpriteTexture GenerateBaseTexture(int seed)
        {
            Perlin noise = new Perlin(0.01, 2, 0.5, 6, seed, QualityMode.Low);

            GDI.Bitmap bmp = new GDI.Bitmap(Width, Height);

            using (GDI.Graphics g = GDI.Graphics.FromImage(bmp))
            {
                g.Clear(GDI.Color.Transparent);

                int offsetX = Width / 8;
                int offsetY = Height / 8;
                for (int y = 0; y < bmp.Height; y += offsetY)
                {
                    for (int x = 0; x < bmp.Width; x += offsetX)
                    {
                        float n = (float)noise.GetValue(x, y, 0);
                        n = (n + 3.0f) * 0.25f;
                        n = Mathf.Clamp(n, 0.5f, 1f);

                        //Color c = new Color(n, n, n);
                        GDI.Color c = GDI.Color.FromArgb(255, (int)(n * 255), (int)(n * 255), (int)(n * 255));
                        GDI.Brush brush = new GDI.SolidBrush(c);

                        g.FillRectangle(brush, new GDI.Rectangle(x, y, offsetX, offsetY));

                        //for (int y1 = 0; y1 < offsetY; y1++)
                        //{
                        //    for (int x1 = 0; x1 < offsetX; x1++)
                        //    {
                        //        float r = random.Range(0.9f, 1.0f);
                        //        GDI.Color c2 = GDI.Color.FromArgb(255, (int)(c.R * r), (int)(c.G * r), (int)(c.B * r));
                        //        bmp.SetPixel(x + x1, y1, c2);
                        //    }
                        //}

                        //for (int y1 = 0; y1 < offsetY; y1++)
                        //{
                        //    for (int x1 = 0; x1 < offsetX; x1++)
                        //    {
                        //        float r = random.Range(0.9f, 1.0f);
                        //        GDI.Color c2 = GDI.Color.FromArgb(255, (int)(c.R * r), (int)(c.G * r), (int)(c.B * r));
                        //        bmp.SetPixel(x, y + y1, c2);
                        //    }
                        //}

                        GDI.Color current = bmp.GetPixel(x, y);
                        GDI.Color c3 = GDI.Color.FromArgb(255, (int)(current.R * n), (int)(current.G * n), (int)(current.B * n));
                        bmp.SetPixel(x, y, c3);
                    }
                }
            }

            return BitmapToSpriteTexture(bmp);
        }

        #region Public Methods
        public Color[] GetColors()
        {
            return finalTexture.ColorData;
        }

        public SS_SpriteTexture GetSpriteTexture
        {
            get
            {
                return finalTexture;
            }
        }
        #endregion
    }

}