using System;

namespace Stellar_Sprites
{
    public class SS_Random
    {
        [ThreadStatic]
        private static System.Random _local;

        public SS_Random(int seed)
        {
            if (_local == null)
            {
                _local = new System.Random(seed);
            }
        }

        public int Next()
        {
            return _local.Next();
        }

        public float Range(float minimum, float maximum)
        {
            return (float)_local.NextDouble() * (maximum - minimum) + minimum;
        }

        public int Range(int minimum, int maximum)
        {
			return _local.Next(minimum, maximum);
        }

        public int RangeEven(int minimum, int maximum)
        {
			return 2 * Range(minimum / 2, maximum / 2);
        }
    }
}