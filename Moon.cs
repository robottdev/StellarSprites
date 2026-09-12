/*
I'm sure there are more elegant ways to create the sprites than what I'm providing with this starter script. This
does a bit more than is required for demonstration purposes.

Scott
*/

using UnityEngine;
using System.Collections;
using System.Collections.Generic;
using System.Threading;

using Stellar_Sprites;

public class Moon : MonoBehaviour
{
    // List of planet sizes (these look best in my opinion)
    public int[] AvailableSizes = new int[] { 128 };

	// Public fields
	public bool Threaded = false;

    public bool CustomSeed = false;
    public int Seed = 0;

    public bool CustomSize = false;
    public int Size = 128;

	public bool CustomRoughness = false;
	public float Roughness = 0;

	public bool CustomScale = true;
    public float Scale = 1f;

    public bool CustomColors = false;
    public Color[] Colors = new Color[] { new Color(0.40f, 0.40f, 0.40f), new Color(0.63f, 0.63f, 0.63f), new Color(0.75f, 0.75f, 0.75f) };

    public bool CustomLighting = false;
    public float LightAngle = 180f;
    //public float LightStrength = 1f;

    // Private fields
    private SS_Moon spriteObject;
    private bool threadCompleted = false;

    // Use this for initialization
    void Start()
    {
        Generate();
    }

    // Update is called once per frame
    void Update()
    {
        // When the ThreadGenerator function is complete, we can continue and create the SpriteRenderer object
        if (threadCompleted)
        {
            // Create the procedural sprite when it's thread has generated the texture data
            Texture2D texture = new Texture2D(spriteObject.Size, spriteObject.Size);
            texture.filterMode = FilterMode.Trilinear;
            texture.wrapMode = TextureWrapMode.Clamp;
            texture.SetPixels(spriteObject.GetColors());
            texture.Apply();

            var spriteRenderer = GetComponent<SpriteRenderer>();
            if (spriteRenderer == null)
            {
                gameObject.AddComponent<SpriteRenderer>();
                spriteRenderer = GetComponent<SpriteRenderer>();
                spriteRenderer.sortingLayerName = "Moon";
            }
            spriteRenderer.sprite = Sprite.Create(texture, new Rect(0, 0, texture.width, texture.height), new Vector2(0.5f, 0.5f));
            transform.localScale = new Vector3(Scale, Scale, 1);

            threadCompleted = false;
        }

    }

    /// <summary>
    /// Generates the sprite texture in its own thread
    /// </summary>
	void GenerateSprite()
    {
        // This is the good stuff here - Create the texture data
        spriteObject = new SS_Moon(Seed, Size, Roughness, Colors, LightAngle);

        // Once this is complete, we can assign this as the SpriteRenderer sprite.
        threadCompleted = true;
    }

    /// <summary>
    /// Added this code to a method so that I could call it from the Editor script
    /// </summary>
    public void Generate()
    {
        // User wants a random seed
        if (!CustomSeed)
        {
			Seed = Random.Range (0, 100000000);
        }

        // User wants a random size
        if (!CustomSize)
        {
            Size = AvailableSizes[Random.Range(0, AvailableSizes.Length)];
        }

		// User wants a random shape
		if (!CustomRoughness)
		{
			Roughness = Random.Range (0f, 1f);
		}

        // User wants a random scale
        if (!CustomScale)
        {
            Scale = Random.Range(1f, 2f);
        }

        // User wants random colors
        if (!CustomColors)
        {
            Colors = SS_Utilities.GenerateColorWheelColors(Seed, 3);
        }

		// Start thread to generate texture
		if (Threaded)
		{
			Thread t = new Thread(new ThreadStart(GenerateSprite));
			t.Start();
		}
		else
		{
			GenerateSprite();
		}
	}
	
	public void SaveToFile()
	{
		spriteObject.GetSpriteTexture.SaveToFile("moon", Seed);
	}
}
