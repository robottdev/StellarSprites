using UnityEngine;
using System.Collections;
using System.Threading;

using Stellar_Sprites;

public class Background : MonoBehaviour {
    
    // List of available sizes
    public int[] AvailableSizes = new int[] { 128, 256, 512 };

    // Public fields
	public bool Threaded = true;

    public bool CustomSeed = false;
    public int Seed = 0;

	public bool CustomSize = true;
    public int Size = 256;

    public float Frequency = 0.01f;
    public float Lacunarity = 2f;
    public float Persistence = 0.5f;
    public int Octaves = 8;

    public bool CustomStarCount = false;
    public int StarCount = 50;
    public int StarCountMin = 100;
    public int StarCountMax = 250;

    public bool CustomTint = false;
    public Color Tint = Color.blue;

    public bool CustomBrightness = false;
    public float Brightness = 0.5f;
    public float BrightnessMin = 0.15f;
    public float BrightnessMax = 0.85f;

    // Private fields
    private SS_Background spriteObject;
    private bool threadCompleted = false;
	private bool generated = false;
	private MeshRenderer meshRenderer_;
        
    // Use this for initialization
    void Start() {

        Generate();
        
    }

    // Update is called once per frame
    void Update()
    {
		// Can update after it exists
		if (generated)
		{
			float y = Camera.main.transform.position.x;
			float x = Camera.main.transform.position.y;
			meshRenderer_.material.mainTextureOffset = new Vector2(x / 50f, -y / 50f);
		}

        // When the ThreadGenerator function is complete, we can continue and create the SpriteRenderer object
        if (threadCompleted)
        {
            Texture2D texture = new Texture2D(Size, Size, TextureFormat.RGBA32, false);
            texture.filterMode = FilterMode.Point;
            texture.wrapMode = TextureWrapMode.Repeat;
            texture.SetPixels(spriteObject.GetColors());
            texture.Apply();

			var meshFilter = GetComponent<MeshFilter>();
			if (meshFilter != null)
			{
				DestroyImmediate(meshFilter);
			}
			gameObject.AddComponent<MeshFilter>();
			meshFilter = GetComponent<MeshFilter>();

			meshRenderer_ = GetComponent<MeshRenderer>();
			if (meshRenderer_ != null)
			{
				DestroyImmediate(meshRenderer_);
			}
			gameObject.AddComponent<MeshRenderer>();
			meshRenderer_ = GetComponent<MeshRenderer>();

			meshFilter.mesh = CreatePlane (10, 10);
			GetComponent<Renderer>().material.mainTextureScale = new Vector2(3, 3);
			GetComponent<Renderer>().material.mainTexture = texture;
			GetComponent<Renderer>().sortingLayerName = "Background";
			GetComponent<Renderer>().material.shader = Shader.Find ("Unlit/Texture");

			gameObject.transform.parent = Camera.main.transform;
			gameObject.transform.localPosition = new Vector3(0, 0, 15f);
//            var spriteRenderer = GetComponent<SpriteRenderer>();
//            if (spriteRenderer == null)
//            {
//                gameObject.AddComponent<SpriteRenderer>();
//                spriteRenderer = GetComponent<SpriteRenderer>();
//                spriteRenderer.sortingLayerName = "Background";
//            }
//            spriteRenderer.sprite = Sprite.Create(texture, new Rect(0, 0, texture.width, texture.height), new Vector2(0.5f, 0.5f));
//            transform.localScale = new Vector3(1, 1, 1);
			

            threadCompleted = false;
			generated = true;
        }


    }

    /// <summary>
    /// Generates the sprite texture in its own thread
    /// </summary>
	void GenerateSprite()
    {
        // This is the good stuff here - Create the texture data
        spriteObject = new SS_Background(Seed, Size, Size, (double)Frequency, (double)Lacunarity, (double)Persistence, Octaves, StarCount, Tint, Brightness);

        // Once this is complete, we can assign this as the SpriteRenderer sprite.
        threadCompleted = true;
    }

    public void Generate()
    {
        if (!CustomSeed)
        {
			Seed = Random.Range (0, 100000000);
        }

        if (!CustomSize)
        {
            Size = AvailableSizes[Random.Range(0, AvailableSizes.Length)];
        }

        if (!CustomStarCount)
        {
            StarCount = Random.Range(StarCountMin, StarCountMax);
        }

        if (!CustomTint)
        {
            Tint = new Color((float)Random.Range(0f, 1f), (float)Random.Range(0f, 1f), (float)Random.Range(0f, 1f));
        }

        if (!CustomBrightness)
        {
            Brightness = Random.Range(BrightnessMin, BrightnessMax);
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

	private Mesh CreatePlane(float width, float height)
	{
		Mesh m = new Mesh();
		m.name = "BackgroundPlane";
		m.vertices = new Vector3[] {
			new Vector3(width, -height, 0),
			new Vector3(-width, -height, 0),
			new Vector3(-width, height, 0),
			new Vector3(width, height, 0)
			};
		m.uv = new Vector2[] {
			new Vector2 (0, 0),
			new Vector2 (0, 1),
			new Vector2(1, 1),
			new Vector2 (1, 0)
		};
		m.triangles = new int[] { 0, 1, 2, 0, 2, 3};
		m.RecalculateNormals();
		
		return m;
	}


	public void SaveToFile()
	{
		spriteObject.GetSpriteTexture.SaveToFile("bg", Seed);
	}
}
