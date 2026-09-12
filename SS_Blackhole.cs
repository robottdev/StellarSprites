using UnityEngine;
using System;
using System.Collections.Generic;
using GDI = System.Drawing;

using LibNoise;
using LibNoise.Generator;
using LibNoise.Operator;

namespace Stellar_Sprites
{
    public class SS_Blackhole
    {
        public int Seed { get; set; }

		public int Size { get { return 256; } }
        private SS_SpriteTexture finalTexture;
        
        public SS_Blackhole(int seed)
        {
            Seed = seed;

            //GDI.Point center = new GDI.Point(Size / 2, Size / 2);
            //finalTexture = new SS_SpriteTexture(Size, Size);

            //GDI.Bitmap bmp = new GDI.Bitmap (Size, Size);
            //using (GDI.Graphics g = GDI.Graphics.FromImage(bmp))
            //{
            //    g.Clear(GDI.Color.Transparent);

            //    int numSpirals = 90;

            //    for (int i = 0; i < numSpirals; i++)
            //    {
            //        List<GDI.Point> points = new List<GDI.Point>();

            //        float numCPs = 10;
            //        float armLength = 180f;
            //        float step = (armLength / numCPs);

            //        int j = 0;
            //        for (float angle = 0; angle <= armLength; angle += step)
            //        {
            //            float myAngle = ((i * (360f / (float)numSpirals)) + angle) * Mathf.Deg2Rad;
            //            float mySize = j * ((Size / 2) / numCPs);

            //            int px = (int)(center.X + (Mathf.Cos(myAngle) * mySize));
            //            int py = (int)(center.Y + (Mathf.Sin(myAngle) * mySize));

            //            points.Add(new GDI.Point(px, py));
            //            j++;
            //        }

            //        g.DrawLines(new GDI.Pen(GDI.Color.Magenta, 3), points.ToArray());
            //    }
            //}

            //finalTexture = BitmapToSpriteTexture (bmp);

            //for (int y = 0; y < finalTexture.Height; y++)
            //{
            //    for (int x = 0; x < finalTexture.Width; x++)
            //    {
            //        if (finalTexture.GetPixel(x, y) == Color.magenta)
            //        {
            //            float dist = Vector2.Distance(new Vector2(x, y), new Vector2(center.X, center.Y));

            //            float a = (dist / center.X);
            //            if (dist < (center.X / 2))
            //                a = 0;

            //            Color c = Color.black;
            //            c.a = (1 - a);

            //            finalTexture.SetPixel(x, y, c);
            //        }
            //    }
            //}


            //float radius = Size - 12;
            //int atmosphereThickness = 6;

            //Vector2 center = new Vector2(Size / 2, Size / 2);
            //finalTexture = new SS_SpriteTexture(Size, Size);

            //for (int y = 0; y < finalTexture.Height; y++)
            //{
            //    for (int x = 0; x < finalTexture.Width; x++)
            //    {
            //        float dist = Vector2.Distance(new Vector2(x, y), center);

            //        // Fill black
            //        if (dist <= (radius / 2))
            //        {
            //            Color c = Color.black;
            //            finalTexture.SetPixel(x, y, c);
            //        }

            //        // Create glow
            //        if (dist < (radius / 2) + atmosphereThickness && dist > (radius / 2))
            //        {
            //            Color currentPixel = finalTexture.GetPixel(x, y);
            //            Color atmosphereColor = Color.black;
            //            if (currentPixel == Color.clear)
            //            {
            //                atmosphereColor.a = 1;

            //                float dist2 = dist - (radius / 2);
            //                dist2 = (atmosphereThickness - dist2) / atmosphereThickness;
            //                atmosphereColor.a = dist2;

            //                finalTexture.SetPixel(x, y, atmosphereColor);
            //            }
            //        }
            //    }
            //}
            float radius = Size * 0.75f;

            Vector2 center = new Vector2(Size / 2, Size / 2);

            float atmosphereThickness = Size * 0.125f;

            finalTexture = new SS_SpriteTexture(Size, Size);
            for (int y = 0; y < finalTexture.Height; y++)
            {
                for (int x = 0; x < finalTexture.Width; x++)
                {
                    float dist = Vector2.Distance(new Vector2(x, y), center);

                    if (dist <= (radius / 2))
                    {
                        finalTexture.SetPixel(x, y, Color.black);
                    }

                    // Create glow
                    if (true)
                    {
                        Color currentPixel = finalTexture.GetPixel(x, y);

                        Color atmosphereColor = Color.black;
                        if (currentPixel == Color.clear)
                        {
                            atmosphereColor.a = 1;
                            float distToEdge = Vector2.Distance(new Vector2(x, y), center);
                            if (distToEdge < (radius / 2) + atmosphereThickness &&
                                distToEdge > (radius / 2))
                            {
                                float dist2 = dist - (radius / 2);
                                atmosphereColor.a = (atmosphereThickness - dist2) / atmosphereThickness; ;

                                finalTexture.SetPixel(x, y, atmosphereColor);
                            }
                        }
                    }
                }
            }
        }
		
		private SS_SpriteTexture BitmapToSpriteTexture(GDI.Bitmap bitmap)
		{
			SS_SpriteTexture st = new SS_SpriteTexture (bitmap.Width, bitmap.Height);
			for (int y = 0; y < bitmap.Height; y++) {
				for (int x = 0; x < bitmap.Width; x++) {
					GDI.Color c = bitmap.GetPixel (x, y);
					float r = c.R / 255f;
					float g = c.G / 255f;
					float b = c.B / 255f;
					float a = c.A / 255f;
					st.SetPixel (x, y, new Color (r, g, b, a));
				}
			}
			return st;
		}

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
    }
}
