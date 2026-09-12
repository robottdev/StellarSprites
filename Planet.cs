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

public class Planet : MonoBehaviour
{
    // List of planet sizes (these look best in my opinion)
    public int[] AvailableSizes = new int[] { 256, 512 };
    
	// Public fields
	public bool Threaded = false;

    public bool CustomSeed = false;
    public int Seed = 0;

    public bool CustomSize = false;
    public int Size = 256;

	public bool CustomScale = true;
    public float Scale = 1f;

    public bool CustomColors = false;
    public Color[] Colors = new Color[] { Color.blue, Color.green, Color.red };

    public bool CustomPlanetType = false;
    public SS_PlanetType PlanetType = SS_PlanetType.Gas_Giant;

    public bool CustomOceans = false;
    public bool Oceans = false;
    public Color OceanColor = new Color(0.11f, 0.42f, 0.63f);

    public bool CustomClouds = false;
    public bool Clouds = false;
    public float CloudTransparency = 0.25f;
    public float CloudDensity = 0.55f;

    public bool CustomAtmosphere = false;
    public bool Atmosphere = false;

	public bool CustomCity = false;
	public bool City = false;
    public float CityDensity = 0.95f;

    public bool CustomLighting = false;
    public float LightAngle = 180f;

    // Private fields
    private SS_Planet spriteObject;
    private bool threadCompleted = false;

    // Use this for initialization
    void Start() {

        Generate();
    }

    // Update is called once per frame
    void Update() {

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
				spriteRenderer.sortingLayerName = "Planet";
				spriteRenderer.sortingOrder = 0;
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
        spriteObject = new SS_Planet(Seed, Size, Colors, PlanetType, Oceans, Clouds, CloudDensity, CloudTransparency, Atmosphere, City, CityDensity, LightAngle);

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

        // User wants a random planet type
        if (!CustomPlanetType)
        {
            System.Array values = System.Enum.GetValues(typeof(SS_PlanetType));
            PlanetType = (SS_PlanetType)values.GetValue(Random.Range(0, values.Length));

            // Force atmosphere effect on gas giants so they don't have a clear edge
            if (PlanetType == SS_PlanetType.Gas_Giant)
            {
                Atmosphere = false;
            }
        }

        // User wants random ocean flag
        if (!CustomOceans)
        {
            Oceans = Random.Range(0, 2) > 0;
        }
        if (Oceans)
        {
            Colors[0] = OceanColor;
        }

        // User wants random clouds
        if (!CustomClouds)
        {
            // Only for terrestrial planets
            if (PlanetType == SS_PlanetType.Terrestrial)
            {
                Clouds = Random.Range(0, 2) > 0;

                CloudDensity = Random.Range(0.25f, 0.75f);
                CloudTransparency = Random.Range(0.25f, 0.75f);
            }
            else
            {
                Clouds = false;
            }
        }

        // User wants the atmosphere to be random (yes or no)
        if (!CustomAtmosphere)
        {
            Atmosphere = Random.Range(0, 2) > 0;

			// If the planet always meets the following conditions, give it an atmosphere
			if (PlanetType == SS_PlanetType.Terrestrial && Oceans)
			{
				Atmosphere = true;
			}
        }

        // User wants the city density to be random
		if (!CustomCity)
        {
			City = Random.Range(0, 2) > 0;

			if (City)
			{
            	CityDensity = Random.Range(0.9f, 1f);
			}
        }
		if (PlanetType == SS_PlanetType.Gas_Giant || Oceans == false)
		{
			// No city lights on gas giants or oceanless planets
			City = false;
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
		spriteObject.GetSpriteTexture.SaveToFile("planet", Seed);
    }
}
