using UnityEngine;
using System.Collections;

namespace Stellar_Sprites
{
    public class SS_SpriteTexture
    {
        public Color[] ColorData;
        public int Width;
        public int Height;

        public SS_SpriteTexture(Color[] colorData, int width, int height)
        {
            ColorData = colorData;
            Width = width;
            Height = height;
        }

        public SS_SpriteTexture(int width, int height)
        {
            Width = width;
            Height = height;

            ColorData = new Color[Width * Height];
            ColorData.ClearToColor(Color.clear);
        }

        public Color GetPixel(int x, int y)
        {
            return ColorData[x + y * Width];
        }

        public void SetPixel(int x, int y, Color c)
        {
            ColorData[x + y * Width] = c;
        }

        public void SaveToFile(string prefix, int id)
        {
            Texture2D texture = new Texture2D(Width, Height);
            texture.filterMode = FilterMode.Trilinear;
            texture.wrapMode = TextureWrapMode.Clamp;
            texture.SetPixels(ColorData);
            texture.Apply();
            string filename = Application.dataPath + "/Stellar Sprites/Saved Sprites/" + prefix + "_" + id.ToString() + ".png";
            System.IO.File.WriteAllBytes(filename, texture.EncodeToPNG());
            Debug.Log(filename + " " + "saved.");
        }
    }
}
