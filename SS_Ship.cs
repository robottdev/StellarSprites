using UnityEngine;
using System.Collections.Generic;
using GDI = System.Drawing;

using LibNoise;
using LibNoise.Generator;
using LibNoise.Operator;

namespace Stellar_Sprites
{
    public enum SS_ShipType
    {
        Fighter = 0,
        Fighter2 = 1,
        Hauler = 2,
		Saucer = 3
    }

	public class SS_Ship
	{
		public int Width { get { return 64; } }
		public int Height { get { return 64; } }

		public SS_ShipType ShipType;

		private SS_SpriteTexture finalTexture;

		public List<Vector2> enginePoints;
		public List<Vector2> weaponPoints;

		private const int body1Seed = 1;
		private const int body2Seed = 2;
		private const int body3Seed = 3;
		private const int engine1Seed = 4;
        private const int engine2Seed = 5;
        private const int engine3Seed = 6;
        private const int wing1Seed = 7;
        private const int wing2Seed = 8;
        private const int wing3Seed = 9;

		private Color[] GradientColors;

        private float BodyDetail;
        private float WingDetail;
        private float ColorDetail;

		private GDI.Brush fillBrush = new GDI.SolidBrush (GDI.Color.Magenta);
		private GDI.Pen outlinePen = new GDI.Pen (GDI.Color.Black, 1);

		private SS_Random random;

		public SS_Ship(int seed, SS_ShipType shipType, float bodyDetail, float wingDetail, Color[] colors, float colorDetail)
		{
			ShipType = shipType;

            BodyDetail = bodyDetail;
			WingDetail = wingDetail;
			GradientColors = colors;
			ColorDetail = colorDetail;

			random = new SS_Random (seed);

			finalTexture = new SS_SpriteTexture (Width, Height);

			enginePoints = new List<Vector2>();
			weaponPoints = new List<Vector2>();

			int currentSeed = seed;
			if (ShipType == SS_ShipType.Fighter) 
			{
                // Determine body length and engine position based on noise, not random number
                Perlin bodyLengthNoise = new Perlin(0.01, 2, 0.5, 8, currentSeed, QualityMode.Low);
                float bn = (float)bodyLengthNoise.GetValue(10, 0, 0);
                bn = (bn + 3.0f) * 0.25f; // Convert to 0.5 to 1
                bn = Mathf.Clamp(bn, 0.5f, 1.0f);
                bn *= Width;
                int bodyLength = (int)bn;
                if (bodyLength > Width) bodyLength = Width;
                int engineOffset = ((Width - bodyLength) / 2) - 2;
                if (engineOffset < 0)
                    engineOffset = 0;

				SS_SpriteTexture e1 = CreateEngine (currentSeed, 4, 8, engineOffset);
				Texturize (currentSeed, e1, Color.magenta, Color.red, false);
				ShadeEdge (e1);
				SS_Utilities.MergeColors (finalTexture, e1, 0, 8);
				SS_Utilities.MergeColors (finalTexture, e1, 0, -8);
				
				// Set engine points
				Vector2 ep1 = new Vector2(-bodyLength / 2, 8);
				Vector2 ep2 = new Vector2(-bodyLength / 2, -8);
				enginePoints.Add (ep1);
				enginePoints.Add (ep2);

				SS_SpriteTexture wp1 = CreateWeapon (currentSeed, 24, 4, (Width / 3));
				Texturize (currentSeed, wp1, Color.magenta, Color.yellow, false);
				ShadeEdge (wp1);
				SS_Utilities.MergeColors (finalTexture, wp1, 0, 16);
                SS_Utilities.MergeColors(finalTexture, wp1, 0, -16);

				// Set weapon points
				Vector2 wep1 = new Vector2((Width / 3) - 6, 16);
				Vector2 wep2 = new Vector2((Width / 3) - 6, -16);
				weaponPoints.Add (wep1);
				weaponPoints.Add (wep2);

				SS_SpriteTexture w1 = CreateWing(currentSeed, Height, random.RangeEven(12, 24), 0);
				Texturize (currentSeed, w1, Color.magenta, Color.white, true);
				ShadeEdge (w1);
                SS_Utilities.MergeColors(finalTexture, w1, 0, 0);
                
				SS_SpriteTexture b1 = CreateTerrestrialBody (currentSeed, bodyLength, 1);
				Texturize (currentSeed, b1, Color.magenta, Color.white, true);
				ShadeEdge (b1);
				SS_Utilities.MergeColors (finalTexture, b1, 0, 0);

				SS_SpriteTexture w2 = CreateWing (currentSeed, 48, 8, (int)((-bodyLength / 2) * 0.75f));
				Texturize (currentSeed, w2, Color.magenta, Color.white, true);
				ShadeEdge (w2);
                SS_Utilities.MergeColors(finalTexture, w2, 0, 0);

				SS_SpriteTexture c1 = CreateCockpit(currentSeed, random.RangeEven(8, 16), 8, (Width / 2));
				Texturize (currentSeed, c1, Color.magenta, Color.cyan, false);
				ShadeEdge (c1);
                SS_Utilities.MergeColors(finalTexture, c1, 0, 0);

				SS_SpriteTexture w3 = CreateWing (currentSeed, 32, 8, (int)((-bodyLength / 2) * 0.65f));
				Texturize (currentSeed, w3, Color.magenta, Color.white, true);
				ShadeEdge (w3);
                SS_Utilities.MergeColors(finalTexture, w3, 0, 0);
                
			}
			else if (ShipType == SS_ShipType.Fighter2) 
			{
                // Determine body length and engine position based on noise, not random number
                Perlin bodyLengthNoise = new Perlin(0.01, 2, 0.5, 8, currentSeed, QualityMode.Low);
                float bn = (float)bodyLengthNoise.GetValue(10, 0, 0);
                bn = (bn + 3.0f) * 0.25f; // Convert to 0.5 to 1
                bn = Mathf.Clamp(bn, 0.5f, 1.0f);
                bn *= Width;
                int bodyLength = (int)bn;
                if (bodyLength > Width) bodyLength = Width;
                int engineOffset = ((Width - bodyLength) / 2) - 2;
                if (engineOffset < 0)
                    engineOffset = 0;

				SS_SpriteTexture wp1 = CreateWeapon (currentSeed, 24, 4, (Width / 3));
				Texturize (currentSeed, wp1, Color.magenta, Color.yellow, false);
				ShadeEdge (wp1);
				SS_Utilities.MergeColors (finalTexture, wp1, 0, 24);
                SS_Utilities.MergeColors(finalTexture, wp1, 0, -24);
				
				// Set weapon points
				Vector2 wep1 = new Vector2((Width / 3) - 6, 24);
				Vector2 wep2 = new Vector2((Width / 3) - 6, -24);
				weaponPoints.Add (wep1);
				weaponPoints.Add (wep2);

				SS_SpriteTexture w1 = CreateWing(currentSeed, Height, random.RangeEven(12, 24), 0);
				Texturize (currentSeed, w1, Color.magenta, Color.white, true);
				ShadeEdge (w1);
                SS_Utilities.MergeColors(finalTexture, w1, 0, 0);
                
				int tankSpacing = random.RangeEven(8, 16);
				SS_SpriteTexture t1 = CreateTank (currentSeed, 48, 4, 4);
				Texturize (currentSeed, t1, Color.magenta, Color.white, true);
				ShadeEdge (t1);
				SS_Utilities.MergeColors (finalTexture, t1, 0, tankSpacing);
                SS_Utilities.MergeColors(finalTexture, t1, 0, -tankSpacing);
				
				SS_SpriteTexture wp2 = CreateWeapon (currentSeed, 16, 4, (Width / 2) + 8);
				Texturize (currentSeed, wp2, Color.magenta, Color.yellow, false);
				ShadeEdge (wp2);
				SS_Utilities.MergeColors (finalTexture, wp2, 0, 8);
                SS_Utilities.MergeColors(finalTexture, wp2, 0, -8);

				// Set weapon points
				Vector2 wep3 = new Vector2((Width / 2) - 6, 8);
				Vector2 wep4 = new Vector2((Width / 2) - 6, -8);
				weaponPoints.Add (wep3);
				weaponPoints.Add (wep4);
				
				SS_SpriteTexture b1 = CreateTerrestrialBody (currentSeed, bodyLength, 1);
				Texturize (currentSeed, b1, Color.magenta, Color.white, true);
				ShadeEdge (b1);
                SS_Utilities.MergeColors(finalTexture, b1, 0, 0);
                
				SS_SpriteTexture e1 = CreateEngine (currentSeed, 4, 8, engineOffset);
				Texturize (currentSeed, e1, Color.magenta, Color.red, false);
				ShadeEdge (e1);
                SS_Utilities.MergeColors(finalTexture, e1, 0, 0);

				// Set engine points
				Vector2 ep1 = new Vector2(-bodyLength / 2, 0);
				enginePoints.Add (ep1);

				SS_SpriteTexture c1 = CreateCockpit(currentSeed, random.RangeEven(8, 16), 8, (Width / 2));
				Texturize (currentSeed, c1, Color.magenta, Color.cyan, false);
				ShadeEdge (c1);
                SS_Utilities.MergeColors(finalTexture, c1, 0, 0);
				
				SS_SpriteTexture w3 = CreateWing (currentSeed, 32, 8, (int)((-bodyLength / 2) * 0.65f));
				Texturize (currentSeed, w3, Color.magenta, Color.white, true);
				ShadeEdge (w3);
                SS_Utilities.MergeColors(finalTexture, w3, 0, 0);
                
			}
			else if (ShipType == SS_ShipType.Hauler) 
			{
				int bodyLength = Width;
				int engineOffset = ((Width - bodyLength) / 2) - 2;
				if (engineOffset < 0)
					engineOffset = 0;
				
				SS_SpriteTexture e1 = CreateEngine (currentSeed, 4, 8, engineOffset);
				Texturize (currentSeed, e1, Color.magenta, Color.red, false);
				ShadeEdge (e1);
				SS_Utilities.MergeColors (finalTexture, e1, 0, 8);
                SS_Utilities.MergeColors(finalTexture, e1, 0, -8);

				// Set engine points
				Vector2 ep1 = new Vector2(-bodyLength / 2, 8);
				Vector2 ep2 = new Vector2(-bodyLength / 2, -8);
				enginePoints.Add (ep1);
				enginePoints.Add (ep2);

				SS_SpriteTexture b1 = CreateTerrestrialBody (currentSeed, bodyLength, 1);
				Texturize (currentSeed, b1, Color.magenta, Color.white, true);
				ShadeEdge (b1);
                SS_Utilities.MergeColors(finalTexture, b1, 0, 0);

				SS_SpriteTexture c1 = CreateCockpit(currentSeed, random.RangeEven(8, 16), 8, (Width / 2));
				Texturize (currentSeed, c1, Color.magenta, Color.cyan, false);
				ShadeEdge (c1);
                SS_Utilities.MergeColors(finalTexture, c1, 0, 0);
                
				
				SS_SpriteTexture w3 = CreateWing (currentSeed, (int)(Height * 0.75f), 8, -16);
				Texturize (currentSeed, w3, Color.magenta, Color.white, true);
				ShadeEdge (w3);
                SS_Utilities.MergeColors(finalTexture, w3, 0, 0);
                
			}
			else if (ShipType == SS_ShipType.Saucer)
			{
				int bodySize = random.RangeEven ((int)(Width * 0.75), Width);
				int numBodyPoints = random.RangeEven(6, 32);
				
				float bodyAngleSteps = 360.0f / numBodyPoints;
				
				List<GDI.Point> bodyPoints = new List<GDI.Point>();
				for (float angle = 0; angle < 360f; angle += bodyAngleSteps)
				{
					int px = (int)((Width / 2) + (Mathf.Cos(angle * Mathf.Deg2Rad) * (bodySize * 0.5)));
					int py = (int)((Height / 2) + (Mathf.Sin(angle * Mathf.Deg2Rad) * (bodySize * 0.5)));
					
					bodyPoints.Add(new GDI.Point(px, py));
				}
				GDI.Bitmap bmp = new GDI.Bitmap (Width, Height);
				using (GDI.Graphics g = GDI.Graphics.FromImage(bmp))
				{
					g.Clear(GDI.Color.Transparent);

					g.FillPolygon(fillBrush, bodyPoints.ToArray());
					g.DrawPolygon(outlinePen, bodyPoints.ToArray());
				}
				
				SS_SpriteTexture b1 = BitmapToSpriteTexture (bmp);
				Texturize (currentSeed, b1, Color.magenta, Color.white, true);
				ShadeEdge (b1);
                SS_Utilities.MergeColors(finalTexture, b1, 0, 0);
                
				int tankSpacing = random.RangeEven(8, 16);
				SS_SpriteTexture t1 = CreateTank (currentSeed, 48, 4, 4);
				Texturize (currentSeed, t1, Color.magenta, Color.white, true);
				ShadeEdge (t1);
				SS_Utilities.MergeColors (finalTexture, t1, 0, tankSpacing);
                SS_Utilities.MergeColors(finalTexture, t1, 0, -tankSpacing);

				SS_SpriteTexture w2 = CreateWing(currentSeed, random.RangeEven(Width / 2, Width), 16, (int)((-Width / 2) * 0.25f));
				Texturize (currentSeed, w2, Color.magenta, Color.white, true);
				ShadeEdge (w2);
                SS_Utilities.MergeColors(finalTexture, w2, 0, 0);

				SS_SpriteTexture c1 = CreateCockpit(currentSeed, random.RangeEven(8, 16), 8, (Width / 2));
				Texturize (currentSeed, c1, Color.magenta, Color.cyan, false);
				ShadeEdge (c1);
                SS_Utilities.MergeColors(finalTexture, c1, 0, 0);
			}
		}

		private SS_SpriteTexture CreateTerrestrialBody(int seed, int length, int smoothCount)
		{
			Perlin bodyNoise = new Perlin ((double)BodyDetail, 2, 0.5, 8, seed, QualityMode.Medium);

			int step = Width / 16;
			GDI.Point center = new GDI.Point(Width / 2, Height / 2);
			
			GDI.Bitmap bmp = new GDI.Bitmap (Width, Height);
			using (GDI.Graphics g = GDI.Graphics.FromImage(bmp))
			{
				g.Clear(GDI.Color.Transparent);

				List<GDI.Point> points = new List<GDI.Point>();
				List<GDI.Point> tmpPoints = new List<GDI.Point>();

				int x = center.X - (length / 2);
				bool finished = false;
				while (!finished)
				{
					float yN = (float)bodyNoise.GetValue (x, 0, 0);
					yN = (yN + 3.0f) * 0.25f; // Convert to 0 to 1
					yN = Mathf.Clamp (yN, 0.05f, 1f);
					
					float maxHeight = Height / 4f;
					
					int y = (int)(yN * maxHeight);
					
					points.Add (new GDI.Point(x, center.Y + y));
					tmpPoints.Add (new GDI.Point(x, (center.Y - y) - 1));
					
					// Increment x and make sure we hit the very edge as well
					x += step;
					if (x == center.X + (length / 2))
					{
						x = Width - 1;
					}
					else if (x > center.X + (length / 2))
					{
						finished = true;
					}
				}
				
				points[0] = new GDI.Point(points[0].X, center.Y + 4);
				tmpPoints[0] = new GDI.Point(tmpPoints[0].X, center.Y - 4);
				points[points.Count - 1] = new GDI.Point(points[points.Count - 1].X, center.Y + 2);
				tmpPoints[tmpPoints.Count - 1] = new GDI.Point(tmpPoints[tmpPoints.Count - 1].X, center.Y - 2);
				
				for (int j = 0; j < smoothCount; j++)
				{
					for (int i = 0; i < points.Count - 1; i++)
					{
						float y = (points[i].Y + points[i + 1].Y) / 2f;
						points[i] = new GDI.Point(points[i].X, (int)y);
					}
					
					for (int i = 0; i < tmpPoints.Count - 1; i++)
					{
						float y = (tmpPoints[i].Y + tmpPoints[i + 1].Y) / 2f;
						tmpPoints[i] = new GDI.Point(tmpPoints[i].X, (int)y);
					}
				}
				
				for (int i = tmpPoints.Count - 1; i >= 0; i--)
				{
					points.Add (tmpPoints[i]);
				}
				
				g.FillPolygon(fillBrush, points.ToArray());
				g.DrawPolygon(outlinePen, points.ToArray());
			}

			int cntr = 1;
			for (int y = center.Y; y < bmp.Height; y++) 
			{
				for (int x = 0; x < bmp.Width; x++)
				{
					int newY = y - cntr;
					GDI.Color c = bmp.GetPixel (x, y);
					bmp.SetPixel (x, newY, c);
				}
				cntr+=2;
			}

			return BitmapToSpriteTexture (bmp);
		}

		private SS_SpriteTexture CreateWing(int seed, int wingLength, int thickness, int xOffset)
		{
            RidgedMultifractal wingFrontNoise = new RidgedMultifractal((double)WingDetail, 2, 8, seed, QualityMode.Medium);
            RidgedMultifractal wingBackNoise = new RidgedMultifractal((double)WingDetail, 2, 8, seed + 1, QualityMode.Medium);

			int step = wingLength / 8;
			int skewDir = -1;
			if (random.Range(0, 1) > 0)
                skewDir = 1;
			GDI.Point center = new GDI.Point (Width / 2, Height / 2);
			
			GDI.Bitmap bmp = new GDI.Bitmap (Width, Height);
			using (GDI.Graphics g = GDI.Graphics.FromImage(bmp))
			{
				g.InterpolationMode = GDI.Drawing2D.InterpolationMode.NearestNeighbor;
				g.PixelOffsetMode = GDI.Drawing2D.PixelOffsetMode.Half;
				g.SmoothingMode = GDI.Drawing2D.SmoothingMode.None;

				g.Clear(GDI.Color.Transparent);

				List<GDI.Point> pointsTL = new List<GDI.Point>();
				List<GDI.Point> pointsTR = new List<GDI.Point>();

				int startY = center.Y;
				int endY = startY + (wingLength / 2) - 1;

				int skewMod = 0;

				int yCntr = 0;
				for (int y = startY; y <= endY + 1; y += step)
				{
					float xNf = (float)wingFrontNoise.GetValue (0, y, 0);
					xNf = (xNf + 1.0f) * 0.5f; // Convert to 0 to 1
					xNf = Mathf.Clamp (xNf, 0.05f, 1f);
					int xf = (int)(xNf * thickness);

					float xNb = (float)wingBackNoise.GetValue (0, y, 0);
					xNb = (xNb + 1.0f) * 0.5f; // Convert to 0 to 1
					xNb = Mathf.Clamp (xNb, 0.05f, 1f);
					int xb = (int)(xNb * thickness);

					pointsTL.Add (new GDI.Point((center.X - xb) + skewMod, y));
					pointsTR.Add (new GDI.Point((center.X + xf) + skewMod, y));

					yCntr += step;
					skewMod += skewDir;
				}

				for (int j = 0; j < 2; j++)
				{
					for (int i = 0; i < pointsTL.Count - 1; i++)
					{
						float x = (pointsTL[i].X + pointsTL[i + 1].X) / 2f;
						pointsTL[i] = new GDI.Point((int)x, pointsTL[i].Y);
					}
					
					for (int i = 0; i < pointsTR.Count - 1; i++)
					{
						float x = (pointsTR[i].X + pointsTR[i + 1].X) / 2f;
						pointsTR[i] = new GDI.Point((int)x, pointsTR[i].Y);
					}
				}

				List<GDI.Point> points = new List<GDI.Point>();
				for (int i = 0; i < pointsTL.Count; i++)
				{
					points.Add(pointsTL[i]);
				}
				for (int i = pointsTR.Count - 1; i >= 0; i--)
				{
					points.Add(pointsTR[i]);
				}

				for (int i = 0; i < points.Count; i++)
				{
					points[i] = new GDI.Point(xOffset + points[i].X, points[i].Y);

					if (points[i].X < 1) 
						points[i] = new GDI.Point(1, points[i].Y);
					if (points[i].X > Width - 2) 
						points[i] = new GDI.Point(Width - 2, points[i].Y);
				}

				g.FillPolygon(fillBrush, points.ToArray());
				g.DrawPolygon(outlinePen, points.ToArray());
			}
			
			int cntr = 1;
			for (int y = center.Y; y < bmp.Height; y++) 
			{
				for (int x = 0; x < bmp.Width; x++)
				{
					int newY = y - cntr;
					GDI.Color c = bmp.GetPixel (x, y);
					bmp.SetPixel (x, newY, c);
				}
				cntr+=2;
			}

			return BitmapToSpriteTexture (bmp);
		}

		private SS_SpriteTexture CreateWeapon(int seed, int length, int thickness, int xOffset)
		{
			//Perlin bodyNoise = new Perlin (0.01, 2, 0.5, 8, seed, QualityMode.Medium);

            int step = 1;
            GDI.Point center = new GDI.Point(Width / 2, Height / 2);
			
			GDI.Bitmap bmp = new GDI.Bitmap (Width, Height);
			using (GDI.Graphics g = GDI.Graphics.FromImage(bmp))
			{
				g.Clear(GDI.Color.Transparent);

				List<GDI.Point> points = new List<GDI.Point>();
				List<GDI.Point> tmpPoints = new List<GDI.Point>();
				
				int x = xOffset;
				bool finished = false;
				while (!finished)
				{
//					float yN = (float)bodyNoise.GetValue (x, 0, 0);
//					yN = (yN + 1.0f) * 0.5f; // Convert to 0 to 1
//					yN = Mathf.Clamp (yN, 0.05f, 1f);
//					
//					float maxHeight = thickness;
//					
//					int y = (int)(yN * maxHeight);
					int y = 1;//(int)Mathf.Clamp (y, 2, 2);

                    points.Add(new GDI.Point(x, center.Y + y));
                    tmpPoints.Add(new GDI.Point(x, (center.Y - y) - 1));
					
					// Increment x and make sure we hit the very edge as well
					x += step;
					if (x == Width - 1)
					{
						x = Width - 1;
					}
					else if (x > xOffset + length)
					{
						finished = true;
					}
				}
				
				for (int i = tmpPoints.Count - 1; i >= 0; i--)
				{
					points.Add (tmpPoints[i]);
				}
				
				g.FillPolygon(fillBrush, points.ToArray());
				g.DrawPolygon(outlinePen, points.ToArray());
			}
			
			return BitmapToSpriteTexture (bmp);
		}

		private SS_SpriteTexture CreateTank(int seed, int length, int thickness, int xOffset)
		{
			Perlin bodyNoise = new Perlin (0.01, 2, 0.5, 8, seed, QualityMode.Medium);
			
			int step = 1;
			GDI.Point center = new GDI.Point(Width / 2, Height / 2);
			
			GDI.Bitmap bmp = new GDI.Bitmap (Width, Height);
			using (GDI.Graphics g = GDI.Graphics.FromImage(bmp))
			{
				g.Clear(GDI.Color.Transparent);
				
				List<GDI.Point> points = new List<GDI.Point>();
				List<GDI.Point> tmpPoints = new List<GDI.Point>();
				
				int x = xOffset;
				bool finished = false;
				while (!finished)
				{
					float yN = (float)bodyNoise.GetValue (x, 0, 0);
					yN = (yN + 1.0f) * 0.5f; // Convert to 0 to 1
					yN = Mathf.Clamp (yN, 0.05f, 1f);
					
					float maxHeight = thickness;
					
					int y = (int)(yN * maxHeight);
					if (y < 2) y = 2;

					points.Add(new GDI.Point(x, center.Y + y));
					tmpPoints.Add(new GDI.Point(x, (center.Y - y) - 1));
					
					// Increment x and make sure we hit the very edge as well
					x += step;
					if (x == Width - 1)
					{
						x = Width - 1;
					}
					else if (x > xOffset + length)
					{
						finished = true;
					}
				}
				
				for (int i = tmpPoints.Count - 1; i >= 0; i--)
				{
					points.Add (tmpPoints[i]);
				}
				
				g.FillPolygon(fillBrush, points.ToArray());
				g.DrawPolygon(outlinePen, points.ToArray());
			}
			
			return BitmapToSpriteTexture (bmp);
		}

		private SS_SpriteTexture CreateEngine(int seed, int length, int thickness, int xOffset)
		{
			Perlin bodyNoise = new Perlin (0.01, 2, 0.5, 8, seed, QualityMode.Medium);

            int step = 1;
            GDI.Point center = new GDI.Point(Width / 2, Height / 2);
			
			GDI.Bitmap bmp = new GDI.Bitmap (Width, Height);
			using (GDI.Graphics g = GDI.Graphics.FromImage(bmp))
			{
				g.Clear(GDI.Color.Transparent);
				
				List<GDI.Point> points = new List<GDI.Point>();
				List<GDI.Point> tmpPoints = new List<GDI.Point>();

				int x = xOffset;
				bool finished = false;
				while (!finished)
				{
					float yN = (float)bodyNoise.GetValue (x, 0, 0);
					yN = (yN + 1.0f) * 0.5f; // Convert to 0 to 1
					yN = Mathf.Clamp (yN, 0.05f, 1f);
					
					float maxHeight = thickness;
					
					int y = (int)(yN * maxHeight);
					
					points.Add (new GDI.Point(x, center.Y + y));
                    tmpPoints.Add(new GDI.Point(x, (center.Y - y) - 1));
					
					// Increment x and make sure we hit the very edge as well
					x += step;
					if (x == Width - 1)
					{
						x = Width - 1;
					}
					else if (x > xOffset + length)
					{
						finished = true;
					}
				}

				for (int i = tmpPoints.Count - 1; i >= 0; i--)
				{
					points.Add (tmpPoints[i]);
				}
				
				g.FillPolygon(fillBrush, points.ToArray());
				g.DrawPolygon(outlinePen, points.ToArray());
			} 

			return BitmapToSpriteTexture (bmp);
		}

		private SS_SpriteTexture CreateCockpit(int seed, int length, int thickness, int xOffset)
		{
			Perlin bodyNoise = new Perlin (0.1, 2, 0.5, 8, seed, QualityMode.Medium);

            int step = 1;
            GDI.Point center = new GDI.Point(Width / 2, Height / 2);
			
			GDI.Bitmap bmp = new GDI.Bitmap (Width, Height);
			using (GDI.Graphics g = GDI.Graphics.FromImage(bmp))
			{
				g.Clear(GDI.Color.Transparent);
				
				List<GDI.Point> points = new List<GDI.Point>();
				List<GDI.Point> tmpPoints = new List<GDI.Point>();
				
				int x = xOffset;
				bool finished = false;
				while (!finished)
				{
					float yN = (float)bodyNoise.GetValue (x, 0, 0);
					yN = (yN + 3f) * 0.25f; // Convert to 0 to 1
					yN = Mathf.Clamp (yN, 0.05f, 1f);
					
					float maxHeight = thickness;
					
					int y = (int)(yN * maxHeight);
					
					points.Add (new GDI.Point(x, center.Y + y));
                    tmpPoints.Add(new GDI.Point(x, (center.Y - y) - 1));
					
					// Increment x and make sure we hit the very edge as well
					x += step;
					if (x == Width - 1)
					{
						x = Width - 1;
					}
					else if (x > xOffset + length)
					{
						finished = true;
					}
				}

                points[0] = new GDI.Point(points[0].X, center.Y + 2);
                tmpPoints[0] = new GDI.Point(tmpPoints[0].X, center.Y - 2);
                points[points.Count - 1] = new GDI.Point(points[points.Count - 1].X, center.Y + 2);
                tmpPoints[tmpPoints.Count - 1] = new GDI.Point(tmpPoints[tmpPoints.Count - 1].X, center.Y - 2);

				for (int i = tmpPoints.Count - 1; i >= 0; i--)
				{
					points.Add (tmpPoints[i]);
				}
				
				g.FillPolygon(fillBrush, points.ToArray());
				g.DrawPolygon(outlinePen, points.ToArray());
			}
			
			return BitmapToSpriteTexture (bmp);
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
            Perlin perlin = new Perlin((double)ColorDetail, 2, 0.5, 8, seed, QualityMode.Low);
			Voronoi hightlightVoronoi = new Voronoi ((double)ColorDetail, 2, seed + 1, false);
			
			float eastShading = 1.5f;
			float westShading = 1.5f;
			float northShading = 1.5f;
			float southShading = 1.5f;
			int shadingThickness = 4;
			
			for (int y = spriteTexture.Height / 2; y < spriteTexture.Height; y++)
			{
				for (int x = 0; x < spriteTexture.Width; x++)
				{
					if (spriteTexture.GetPixel(x, y) == targetColor)
					{
						// Pixel shade
						float pixelNoise = (float)perlin.GetValue(x, y, 0);
						pixelNoise = (pixelNoise + 3.0f) * 0.25f; // 0.5 to 1.0
						pixelNoise = Mathf.Clamp(pixelNoise, 0.5f, 1f);
						
						Color hullShade = tint;
						hullShade *= pixelNoise;
						
						if (highlights)
						{
							// Pixel shade
							float hightlightNoise = (float)hightlightVoronoi.GetValue(x, y, 0);
							hightlightNoise = (hightlightNoise + 1.0f) * 0.5f; // 0.0 to 1.0
							hightlightNoise = Mathf.Clamp(hightlightNoise, 0.0f, 1f);
							
							if (hightlightNoise <= 0.75f)
							{
								//Color gradient = gradientColors[(int)(hightlightNoise * (gradientColors.Width - 1))];
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
			//for (int y = spriteTexture.Height - 1; y >= (spriteTexture.Height / 2); y--)
			for (int y = 0; y < (spriteTexture.Height / 2); y++)
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
		}

        //private SS_SpriteTexture GenerateBaseTexture(int seed)
        //{
            //Perlin noise = new Perlin(0.01, 2, 0.5, 6, seed, QualityMode.Low);

            //SS_SpriteTexture tmpSprite = new SS_SpriteTexture(Width, Height);

            //int offsetX = Width / 8;
            //int offsetY = Height / 8;
            //for (int y = 0; y < tmpSprite.Height; y += offsetY)
            //{
            //    for (int x = 0; x < tmpSprite.Width; x += offsetX)
            //    {
            //        //float n = baseNoise.GetNoise(x, y, seed);
            //        float n = (float)noise.GetValue(x, y, 0);
            //        n = (n + 1.0f) * 0.5f;
            //        n = Mathf.Clamp(n, 0f, 1f);

            //        Color c = new Color(n, n, n);

            //        SS_Utilities.DrawRectangleFilled(tmpSprite, x, y, offsetX, offsetY, c);

            //        for (int y1 = 0; y1 < offsetY; y1++)
            //        {
            //            for (int x1 = 0; x1 < offsetX; x1++)
            //            {
            //                float r = random.Range(0.9f, 1.0f);
            //                Color c2 = new Color(c.r * r, c.g * r, c.b * r);

            //                tmpSprite.ColorData[(x + x1) + y * tmpSprite.Width] = c2;
            //            }
            //        }

            //        for (int y1 = 0; y1 < offsetY; y1++)
            //        {
            //            for (int x1 = 0; x1 < offsetX; x1++)
            //            {
            //                float r = random.Range(0.9f, 1.0f);
            //                Color c2 = new Color(c.r * r, c.g * r, c.b * r);

            //                tmpSprite.ColorData[x + (y + y1) * tmpSprite.Width] = c2;
            //            }
            //        }
            //    }
            //}

        //    return tmpSprite;
        //}

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
		
		public Vector2 GetImagePoint(string name)
		{
			Vector2 position = Vector2.zero;

			return position;
		}
		#endregion
	}

}